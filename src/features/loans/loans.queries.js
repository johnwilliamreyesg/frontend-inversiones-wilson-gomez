import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/index.js';

export const loanKeys = {
  all: ['loans'],
  list: (filters) => ['loans', 'list', filters],
  detail: (id) => ['loans', 'detail', String(id)],
  payments: (id) => ['loans', 'detail', String(id), 'payments'],
  preview: (terms) => ['loans', 'preview', terms],
};

/**
 * A loan, payment or void changes balances shown on many screens
 * (loan, client, collections, payments, reports): refresh all of them.
 */
export const invalidateMoneyData = (queryClient) =>
  Promise.all(
    [['loans'], ['payments'], ['collections'], ['reports'], ['clients', 'detail']].map((queryKey) => queryClient.invalidateQueries({ queryKey })),
  );

export const useLoans = (filters) =>
  useQuery({ queryKey: loanKeys.list(filters), queryFn: () => api.loans.list(filters), placeholderData: keepPreviousData });

export const useLoan = (id) => useQuery({ queryKey: loanKeys.detail(id), queryFn: () => api.loans.get(id) });

export const useLoanPayments = (id) => useQuery({ queryKey: loanKeys.payments(id), queryFn: () => api.payments.listByLoan(id) });

/** Live projection while the form is filled; `terms` null = not ready yet. */
export const useLoanPreview = (terms) =>
  useQuery({
    queryKey: loanKeys.preview(terms),
    queryFn: () => api.loans.preview(terms),
    enabled: Boolean(terms),
    placeholderData: keepPreviousData,
    retry: false,
    staleTime: Infinity,
  });

export const useCreateLoan = () => {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: (loan) => api.loans.create(loan), onSuccess: () => invalidateMoneyData(queryClient) });
};

export const useCancelLoan = () => {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: (id) => api.loans.cancel(id), onSuccess: () => invalidateMoneyData(queryClient) });
};

export const useRescheduleInstallment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ loanId, installmentId, changes }) => api.loans.rescheduleInstallment(loanId, installmentId, changes),
    onSuccess: () => invalidateMoneyData(queryClient),
  });
};

export const useRegisterPayment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ loanId, payment }) => api.payments.register(loanId, payment),
    onSuccess: () => invalidateMoneyData(queryClient),
  });
};

export const useVoidPayment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ paymentId, reason }) => api.payments.void(paymentId, reason),
    onSuccess: () => invalidateMoneyData(queryClient),
  });
};
