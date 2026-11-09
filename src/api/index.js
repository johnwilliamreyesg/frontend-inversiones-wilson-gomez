import { env } from '../config/env.js';
import { HttpClient } from './http-client.js';
import { tokenStorage } from './token-storage.js';
import { createAuthApi } from './auth.api.js';
import { createClientsApi } from './clients.api.js';
import { createLoansApi } from './loans.api.js';
import { createPaymentsApi } from './payments.api.js';
import { createExpensesApi } from './expenses.api.js';
import { createUsersApi } from './users.api.js';
import { createReportsApi } from './reports.api.js';
import { createInterestRatesApi } from './interest-rates.api.js';
import { createExportsApi, createWriteOffsApi } from './write-offs.api.js';

// Listeners for "the session expired" (the AuthProvider subscribes).
const unauthorizedListeners = new Set();
export const onSessionExpired = (listener) => {
  unauthorizedListeners.add(listener);
  return () => unauthorizedListeners.delete(listener);
};

// Composition root of the data layer: one HttpClient shared by every API module.
const http = new HttpClient({
  baseUrl: env.apiUrl,
  getToken: () => tokenStorage.get(),
  onUnauthorized: (error) => unauthorizedListeners.forEach((listener) => listener(error)),
});

export const api = {
  auth: createAuthApi(http),
  clients: createClientsApi(http),
  loans: createLoansApi(http),
  payments: createPaymentsApi(http),
  expenses: createExpensesApi(http),
  users: createUsersApi(http),
  reports: createReportsApi(http),
  interestRates: createInterestRatesApi(http),
  writeOffs: createWriteOffsApi(http),
  exports: createExportsApi(http),
};

export { tokenStorage };
