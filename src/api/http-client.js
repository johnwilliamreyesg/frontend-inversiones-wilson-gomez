import { ApiError } from './api-error.js';

/** Builds "?a=1&b=2" skipping empty values, so callers can pass whole filter objects. */
export const buildQueryString = (params = {}) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.append(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : '';
};

/**
 * Thin wrapper over fetch that knows the API conventions: base URL, bearer
 * token, JSON bodies, { data, meta } responses and { error } bodies.
 * The API modules depend on this class, never on fetch directly.
 */
export class HttpClient {
  /**
   * @param {object} options
   * @param {string} options.baseUrl
   * @param {() => string | null} options.getToken
   * @param {(error: ApiError) => void} [options.onUnauthorized] called on 401 (expired session)
   * @param {typeof fetch} [options.fetchImpl]
   */
  constructor({ baseUrl, getToken, onUnauthorized = () => {}, fetchImpl = (...args) => fetch(...args) }) {
    this.baseUrl = baseUrl;
    this.getToken = getToken;
    this.onUnauthorized = onUnauthorized;
    this.fetch = fetchImpl;
  }

  /** Returns the whole body ({ data, meta }) or null for 204. */
  async request(method, path, { query, body, formData } = {}) {
    const headers = { Accept: 'application/json' };
    const token = this.getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    if (body !== undefined) headers['Content-Type'] = 'application/json';

    let response;
    try {
      response = await this.fetch(`${this.baseUrl}${path}${buildQueryString(query)}`, {
        method,
        headers,
        body: formData ?? (body !== undefined ? JSON.stringify(body) : undefined),
      });
    } catch {
      throw ApiError.network();
    }

    const payload = await this.#readBody(response);
    if (response.ok) return payload;

    const error = ApiError.fromResponseBody(response.status, payload);
    // A 401 on a request that carried a token means the session ended.
    if (response.status === 401 && token) this.onUnauthorized(error);
    throw error;
  }

  async #readBody(response) {
    if (response.status === 204) return null;
    const text = await response.text();
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  }

  get(path, query) {
    return this.request('GET', path, { query });
  }

  post(path, body) {
    return this.request('POST', path, { body });
  }

  patch(path, body) {
    return this.request('PATCH', path, { body });
  }

  put(path, body) {
    return this.request('PUT', path, { body });
  }

  delete(path) {
    return this.request('DELETE', path);
  }

  /**
   * A file (Excel, PDF...) with the session token: resolves to { blob, filename },
   * the name taken from Content-Disposition. Errors behave like any request.
   */
  async download(path, query) {
    const headers = {};
    const token = this.getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    let response;
    try {
      response = await this.fetch(`${this.baseUrl}${path}${buildQueryString(query)}`, { headers });
    } catch {
      throw ApiError.network();
    }
    if (!response.ok) {
      const error = ApiError.fromResponseBody(response.status, await this.#readBody(response));
      if (response.status === 401 && token) this.onUnauthorized(error);
      throw error;
    }
    const disposition = response.headers.get('Content-Disposition') ?? '';
    const filename = /filename="?([^";]+)"?/.exec(disposition)?.[1] ?? 'archivo';
    return { blob: await response.blob(), filename };
  }

  /** multipart/form-data upload; the browser sets the Content-Type boundary itself. */
  upload(method, path, formData) {
    return this.request(method, path, { formData });
  }
}
