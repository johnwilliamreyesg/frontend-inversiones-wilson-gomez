export const createWriteOffsApi = (http) => ({
  list: () => http.get('/written-off'),
  writeOffClient: async (clientId, reason) => (await http.post(`/written-off/clients/${clientId}`, { reason })).data,
  renegotiate: async (loanId, agreement) => (await http.post(`/written-off/loans/${loanId}/renegotiate`, agreement)).data,
});

// Files: resolve to { blob, filename }.
export const createExportsApi = (http) => ({
  backup: () => http.download('/backup/excel'),
  collectionsPdf: (query) => http.download('/collections/print', query),
});
