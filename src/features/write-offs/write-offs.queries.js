import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/index.js';
import { invalidateMoneyData } from '../loans/loans.queries.js';

// Writing off or negotiating moves money between "en la calle" and "castigada".
const invalidateWriteOffs = (queryClient) =>
  Promise.all([
    invalidateMoneyData(queryClient),
    queryClient.invalidateQueries({ queryKey: ['written-off'] }),
    queryClient.invalidateQueries({ queryKey: ['clients'] }),
  ]);

export const useWrittenOff = () => useQuery({ queryKey: ['written-off'], queryFn: () => api.writeOffs.list() });

export const useWriteOffClient = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ clientId, reason }) => api.writeOffs.writeOffClient(clientId, reason),
    onSuccess: () => invalidateWriteOffs(queryClient),
  });
};

export const useRenegotiate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ loanId, agreement }) => api.writeOffs.renegotiate(loanId, agreement),
    onSuccess: () => invalidateWriteOffs(queryClient),
  });
};
