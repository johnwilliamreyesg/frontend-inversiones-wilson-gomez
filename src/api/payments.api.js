export const createPaymentsApi = (http) => ({
  list: (query) => http.get('/payments', query),
  get: async (id) => (await http.get(`/payments/${id}`)).data,
  listByLoan: async (loanId) => (await http.get(`/loans/${loanId}/payments`)).data,
  register: async (loanId, payment) => (await http.post(`/loans/${loanId}/payments`, payment)).data,
  void: async (id, reason) => (await http.post(`/payments/${id}/void`, { reason })).data,
  collections: (query) => http.get('/collections', query),
  upcoming: (query) => http.get('/collections/upcoming', query),
});
