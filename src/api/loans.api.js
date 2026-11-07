export const createLoansApi = (http) => ({
  list: (query) => http.get('/loans', query),
  get: async (id) => (await http.get(`/loans/${id}`)).data,
  preview: async (terms) => (await http.post('/loans/preview', terms)).data,
  create: async (loan) => (await http.post('/loans', loan)).data,
  cancel: async (id) => (await http.post(`/loans/${id}/cancel`)).data,
  rescheduleInstallment: async (loanId, installmentId, changes) =>
    (await http.patch(`/loans/${loanId}/installments/${installmentId}/due-date`, changes)).data,
});
