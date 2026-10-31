export const createReportsApi = (http) => ({
  daily: async (query) => (await http.get('/reports/daily', query)).data,
  monthly: async (query) => (await http.get('/reports/monthly', query)).data,
  portfolio: async () => (await http.get('/reports/portfolio')).data,
});
