import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/index.js';

export const ADMIN_ROLE_NAME = 'admin';

const useInvalidatingMutation = (mutationFn) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    // Users and roles show each other's data (role name, user count).
    onSuccess: () => Promise.all([queryClient.invalidateQueries({ queryKey: ['users'] }), queryClient.invalidateQueries({ queryKey: ['roles'] })]),
  });
};

export const useUsers = (filters) =>
  useQuery({ queryKey: ['users', 'list', filters], queryFn: () => api.users.list(filters), placeholderData: keepPreviousData });

export const useRoles = () => useQuery({ queryKey: ['roles', 'list'], queryFn: () => api.users.roles() });

export const usePermissions = () => useQuery({ queryKey: ['roles', 'permissions'], queryFn: () => api.users.permissions(), staleTime: Infinity });

export const useSaveUser = () => useInvalidatingMutation(({ id, user }) => (id ? api.users.update(id, user) : api.users.create(user)));

export const useResetPassword = () => useMutation({ mutationFn: ({ id, newPassword }) => api.users.resetPassword(id, newPassword) });

export const useSaveRole = () => useInvalidatingMutation(({ id, role }) => (id ? api.users.updateRole(id, role) : api.users.createRole(role)));

export const useDeleteRole = () => useInvalidatingMutation((id) => api.users.removeRole(id));
