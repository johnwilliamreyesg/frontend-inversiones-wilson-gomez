export const createExpensesApi = (http) => ({
  list: (query) => http.get('/expenses', query),
  create: async (expense) => (await http.post('/expenses', expense)).data,
  update: async (id, changes) => (await http.patch(`/expenses/${id}`, changes)).data,
  remove: (id) => http.delete(`/expenses/${id}`),

  categories: async ({ includeInactive = false } = {}) =>
    (await http.get('/expense-categories', { includeInactive: includeInactive || undefined })).data,
  createCategory: async (category) => (await http.post('/expense-categories', category)).data,
  updateCategory: async (id, changes) => (await http.patch(`/expense-categories/${id}`, changes)).data,
});
