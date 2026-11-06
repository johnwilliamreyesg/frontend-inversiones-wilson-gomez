export const createInterestRatesApi = (http) => ({
  list: async ({ includeInactive = false } = {}) =>
    (await http.get('/interest-rates', { includeInactive: includeInactive || undefined })).data,
  create: async (interestRate) => (await http.post('/interest-rates', interestRate)).data,
  update: async (id, changes) => (await http.patch(`/interest-rates/${id}`, changes)).data,
});
