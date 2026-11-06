import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/index.js';

export const useInterestRates = ({ includeInactive = false, enabled = true } = {}) =>
  useQuery({
    queryKey: ['interest-rates', { includeInactive }],
    queryFn: () => api.interestRates.list({ includeInactive }),
    enabled,
  });

export const useSaveInterestRate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, interestRate }) => (id ? api.interestRates.update(id, interestRate) : api.interestRates.create(interestRate)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['interest-rates'] }),
  });
};
