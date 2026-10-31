export const createClientsApi = (http) => ({
  list: (query) => http.get('/clients', query),
  get: async (id) => (await http.get(`/clients/${id}`)).data,
  create: async (client) => (await http.post('/clients', client)).data,
  update: async (id, changes) => (await http.patch(`/clients/${id}`, changes)).data,
  remove: (id) => http.delete(`/clients/${id}`),
  loans: async (id) => (await http.get(`/clients/${id}/loans`)).data,

  photos: async (id) => (await http.get(`/clients/${id}/photos`)).data,
  uploadPhoto: async (id, position, file) => {
    const form = new FormData();
    form.append('photo', file);
    return (await http.upload('PUT', `/clients/${id}/photos/${position}`, form)).data;
  },
  removePhoto: (id, position) => http.delete(`/clients/${id}/photos/${position}`),
});
