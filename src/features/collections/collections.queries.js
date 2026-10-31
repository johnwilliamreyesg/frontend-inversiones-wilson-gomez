import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from '../../api/index.js';

export const useCollections = (filters) =>
  useQuery({
    queryKey: ['collections', filters],
    queryFn: () => api.payments.collections(filters),
    placeholderData: keepPreviousData,
    // The collector keeps this screen open: refresh when coming back to it.
    refetchOnWindowFocus: true,
  });
