import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ApiError } from '../../src/api/api-error.js';
import { HttpClient, buildQueryString } from '../../src/api/http-client.js';
import { applyServerErrors } from '../../src/utils/form-errors.js';

const jsonResponse = (status, body) => new Response(body === undefined ? null : JSON.stringify(body), { status });

describe('ApiError', () => {
  it('reads the list of field errors of a 400', () => {
    const error = ApiError.fromResponseBody(400, {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Los datos enviados no son válidos.',
        details: [
          { location: 'body', field: 'phoneNumber', message: 'El teléfono debe tener entre 6 y 15 dígitos.' },
          { location: 'query', field: 'page', message: 'Página inválida.' },
        ],
      },
    });
    assert.deepEqual(error.fieldErrors(), { phoneNumber: 'El teléfono debe tener entre 6 y 15 dígitos.' });
  });

  it('turns the 409 { field } object into a message on that field', () => {
    const error = ApiError.fromResponseBody(409, {
      error: { code: 'CONFLICT', message: 'Ya existe un cliente con la cédula 1001: Ana Pérez.', details: { field: 'nationalId', clientId: 1 } },
    });
    assert.deepEqual(error.fieldErrors(), { nationalId: 'Ya existe un cliente con la cédula 1001: Ana Pérez.' });
  });

  it('has a readable message when the server is unreachable or answers garbage', () => {
    assert.match(ApiError.network().message, /conexión/);
    assert.match(ApiError.fromResponseBody(502, null).message, /inesperado/);
  });

  it('copies only the fields the form has', () => {
    const calls = [];
    const error = new ApiError({ status: 400, details: [{ location: 'body', field: 'email', message: 'Mal.' }] });
    assert.equal(applyServerErrors(error, (field, value) => calls.push([field, value.message]), ['email']), true);
    assert.deepEqual(calls, [['email', 'Mal.']]);
    assert.equal(applyServerErrors(error, () => {}, ['fullName']), false);
    assert.equal(applyServerErrors(new Error('x'), () => {}, ['email']), false);
  });
});

describe('HttpClient', () => {
  it('builds query strings skipping empty filters', () => {
    assert.equal(buildQueryString({ search: 'ana pérez', page: 2, status: '', clientId: undefined }), '?search=ana+p%C3%A9rez&page=2');
    assert.equal(buildQueryString({}), '');
  });

  it('sends the token and JSON body, and returns { data, meta }', async () => {
    let request;
    const http = new HttpClient({
      baseUrl: '/api',
      getToken: () => 'abc',
      fetchImpl: async (url, init) => {
        request = { url, init };
        return jsonResponse(201, { data: { id: 1 } });
      },
    });
    const body = await http.post('/clients', { fullName: 'Ana' });
    assert.deepEqual(body, { data: { id: 1 } });
    assert.equal(request.url, '/api/clients');
    assert.equal(request.init.headers.Authorization, 'Bearer abc');
    assert.equal(request.init.body, '{"fullName":"Ana"}');
  });

  it('returns null for 204 No Content', async () => {
    const http = new HttpClient({ baseUrl: '', getToken: () => null, fetchImpl: async () => new Response(null, { status: 204 }) });
    assert.equal(await http.delete('/clients/1'), null);
  });

  it('reports an expired session only when a token was sent', async () => {
    let expired = 0;
    const make = (token) =>
      new HttpClient({
        baseUrl: '',
        getToken: () => token,
        onUnauthorized: () => expired++,
        fetchImpl: async () => jsonResponse(401, { error: { code: 'UNAUTHORIZED', message: 'Debe iniciar sesión.' } }),
      });
    await assert.rejects(make('old-token').get('/auth/me'), (error) => error instanceof ApiError && error.status === 401);
    // A failed login (no token yet) is a wrong password, not an expired session.
    await assert.rejects(make(null).post('/auth/login', {}), ApiError);
    assert.equal(expired, 1);
  });

  it('turns a network failure into an ApiError', async () => {
    const http = new HttpClient({
      baseUrl: '',
      getToken: () => null,
      fetchImpl: async () => {
        throw new TypeError('Failed to fetch');
      },
    });
    await assert.rejects(http.get('/health'), (error) => error instanceof ApiError && error.code === 'NETWORK_ERROR');
  });
});
