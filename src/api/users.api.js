export const createUsersApi = (http) => ({
  list: (query) => http.get('/users', query),
  create: async (user) => (await http.post('/users', user)).data,
  update: async (id, changes) => (await http.patch(`/users/${id}`, changes)).data,
  resetPassword: (id, newPassword) => http.put(`/users/${id}/password`, { newPassword }),

  roles: async () => (await http.get('/roles')).data,
  createRole: async (role) => (await http.post('/roles', role)).data,
  updateRole: async (id, changes) => (await http.patch(`/roles/${id}`, changes)).data,
  removeRole: (id) => http.delete(`/roles/${id}`),
  permissions: async () => (await http.get('/permissions')).data,
});
