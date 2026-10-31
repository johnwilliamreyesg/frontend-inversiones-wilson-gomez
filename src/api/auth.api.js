export const createAuthApi = (http) => ({
  login: async (credentials) => (await http.post('/auth/login', credentials)).data,
  me: async () => (await http.get('/auth/me')).data,
  changePassword: async (passwords) => (await http.patch('/auth/password', passwords)).data,
});
