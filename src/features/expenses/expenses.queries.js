import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/index.js';

// Expenses also change the net profit in the reports.
const invalidateExpenses = (queryClient) =>
  Promise.all([queryClient.invalidateQueries({ queryKey: ['expenses'] }), queryClient.invalidateQueries({ queryKey: ['reports'] })]);

export const useExpenses = (filters) =>
  useQuery({ queryKey: ['expenses', 'list', filters], queryFn: () => api.expenses.list(filters), placeholderData: keepPreviousData });

export const useExpenseCategories = ({ includeInactive = false } = {}) =>
  useQuery({ queryKey: ['expenses', 'categories', { includeInactive }], queryFn: () => api.expenses.categories({ includeInactive }) });

export const useSaveExpense = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, expense }) => (id ? api.expenses.update(id, expense) : api.expenses.create(expense)),
    onSuccess: () => invalidateExpenses(queryClient),
  });
};

export const useDeleteExpense = () => {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: (id) => api.expenses.remove(id), onSuccess: () => invalidateExpenses(queryClient) });
};

export const useSaveCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, category }) => (id ? api.expenses.updateCategory(id, category) : api.expenses.createCategory(category)),
    onSuccess: () => invalidateExpenses(queryClient),
  });
};
