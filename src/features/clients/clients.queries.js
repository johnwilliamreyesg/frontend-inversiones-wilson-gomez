import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/index.js';

// Cache keys: invalidating ['clients'] refreshes every client screen at once.
export const clientKeys = {
  all: ['clients'],
  list: (filters) => ['clients', 'list', filters],
  detail: (id) => ['clients', 'detail', String(id)],
  photos: (id) => ['clients', 'detail', String(id), 'photos'],
  loans: (id) => ['clients', 'detail', String(id), 'loans'],
};

export const useClients = (filters, { enabled = true } = {}) =>
  useQuery({ queryKey: clientKeys.list(filters), queryFn: () => api.clients.list(filters), placeholderData: keepPreviousData, enabled });

export const useClient = (id) => useQuery({ queryKey: clientKeys.detail(id), queryFn: () => api.clients.get(id), enabled: Boolean(id) });

export const useClientPhotos = (id) =>
  useQuery({
    queryKey: clientKeys.photos(id),
    queryFn: () => api.clients.photos(id),
    // Photo links are signed and expire (1 h by default): refresh them before that.
    staleTime: 30 * 60 * 1000,
    refetchInterval: 45 * 60 * 1000,
  });

export const useClientLoans = (id) => useQuery({ queryKey: clientKeys.loans(id), queryFn: () => api.clients.loans(id) });

export const useSaveClient = (id) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (client) => (id ? api.clients.update(id, client) : api.clients.create(client)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: clientKeys.all }),
  });
};

export const useDeleteClient = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.clients.remove(id),
    // Only the lists: refetching the deleted client's own detail would just answer 404.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clients', 'list'] }),
  });
};

export const useUploadPhoto = (clientId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ position, file }) => api.clients.uploadPhoto(clientId, position, file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: clientKeys.photos(clientId) }),
  });
};

export const useDeletePhoto = (clientId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (position) => api.clients.removePhoto(clientId, position),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: clientKeys.photos(clientId) }),
  });
};
