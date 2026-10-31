const NETWORK_ERROR_MESSAGE = 'No hay conexión con el servidor. Revise su internet e intente de nuevo.';
const UNEXPECTED_ERROR_MESSAGE = 'Ocurrió un error inesperado. Intente de nuevo.';

/**
 * The backend sends `details` in two shapes:
 * - 400: a list [{ location, field, message }], one per invalid field;
 * - 409: one object { field, ... } naming the field that clashes (cédula, email, name).
 * Both become the list shape; for the 409 the field message is the main message.
 */
const normalizeDetails = (details, message) => {
  if (Array.isArray(details)) return details;
  if (details && typeof details === 'object' && details.field) return [{ location: 'body', field: details.field, message }];
  return [];
};

/**
 * Error thrown for every failed API call. Mirrors the backend error body:
 * { error: { code, message, details } }.
 */
export class ApiError extends Error {
  constructor({ status = 0, code = 'NETWORK_ERROR', message, details } = {}) {
    super(message || (status === 0 ? NETWORK_ERROR_MESSAGE : UNEXPECTED_ERROR_MESSAGE));
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = normalizeDetails(details, this.message);
  }

  static fromResponseBody(status, body) {
    const error = body?.error ?? {};
    return new ApiError({ status, code: error.code ?? 'UNEXPECTED_ERROR', message: error.message, details: error.details });
  }

  static network() {
    return new ApiError();
  }

  /** Field messages from the request body, keyed by field name: { phoneNumber: '...' }. */
  fieldErrors() {
    return Object.fromEntries(
      this.details.filter((detail) => detail.location === 'body' && detail.field).map((detail) => [detail.field, detail.message]),
    );
  }
}

/** Message to show the user for any error (ApiError or not). */
export const errorMessage = (error) => (error instanceof ApiError ? error.message : UNEXPECTED_ERROR_MESSAGE);
