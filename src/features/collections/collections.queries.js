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

/** Installments due in the next `days` days (to remind clients beforehand). */
export const useUpcoming = ({ days, enabled = true }) =>
  useQuery({
    queryKey: ['collections', 'upcoming', days],
    queryFn: () => api.payments.upcoming({ days }),
    enabled,
    refetchOnWindowFocus: true,
  });
