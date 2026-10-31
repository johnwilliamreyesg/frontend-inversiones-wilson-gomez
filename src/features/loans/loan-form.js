import { z } from 'zod';

// Pure helpers of the loan form (no React), so they can be unit-tested.

const MAX_INSTALLMENTS = 120;

/** "2,5" or "2.5" → 2.5; "" → null; anything else → NaN (shown as an error). */
export const parseDecimal = (text) => {
  const clean = String(text ?? '').trim().replace(',', '.');
  if (!clean) return null;
  return /^\d+(\.\d{1,2})?$/.test(clean) ? Number(clean) : Number.NaN;
};

/** "10" → 10; "" → null; "1.5" or "abc" → NaN. */
export const parseInteger = (text) => {
  const clean = String(text ?? '').trim();
  if (!clean) return null;
  return /^\d+$/.test(clean) ? Number(clean) : Number.NaN;
};

export const emptyLoanForm = (today) => ({
  clientId: null,
  coDebtorId: null,
  frequency: 'biweekly',
  principalAmount: null,
  startDate: today,
  installmentAmount: null,
  numberOfInstallments: '',
  monthlyInterestRate: '',
  paymentDay: '',
  notes: '',
});

const addIssue = (ctx, path, message) => ctx.addIssue({ code: 'custom', path: [path], message });

/**
 * Validates the money terms only (what the preview needs). Same rules as
 * the backend's loan.validators.js; the backend checks again on save.
 */
const checkTerms = (values, ctx, { today }) => {
  if (!values.principalAmount) addIssue(ctx, 'principalAmount', 'Escriba el valor prestado.');
  if (!values.startDate) addIssue(ctx, 'startDate', 'Elija la fecha de desembolso.');
  else if (values.startDate > today) addIssue(ctx, 'startDate', 'La fecha de desembolso no puede ser futura.');

  const installments = parseInteger(values.numberOfInstallments);
  const installmentsInvalid = Number.isNaN(installments) || (installments !== null && (installments < 1 || installments > MAX_INSTALLMENTS));
  if (installmentsInvalid) addIssue(ctx, 'numberOfInstallments', `Escriba un número entero entre 1 y ${MAX_INSTALLMENTS}.`);

  if (values.frequency === 'biweekly') {
    if (!values.installmentAmount) addIssue(ctx, 'installmentAmount', 'Escriba el valor de cada cuota.');
    if (installments === null) addIssue(ctx, 'numberOfInstallments', 'Escriba el número de cuotas.');
    if (values.installmentAmount && installments && values.principalAmount && values.installmentAmount * installments < values.principalAmount) {
      addIssue(ctx, 'installmentAmount', 'Las cuotas no alcanzan a cubrir el capital prestado.');
    }
    return;
  }

  const rate = parseDecimal(values.monthlyInterestRate);
  if (rate === null) addIssue(ctx, 'monthlyInterestRate', 'Escriba la tasa de interés mensual.');
  else if (Number.isNaN(rate) || rate <= 0 || rate > 100) addIssue(ctx, 'monthlyInterestRate', 'Escriba una tasa entre 0 y 100 (máximo 2 decimales).');

  const day = parseInteger(values.paymentDay);
  if (Number.isNaN(day) || (day !== null && (day < 1 || day > 31))) addIssue(ctx, 'paymentDay', 'El día de pago debe estar entre 1 y 31.');
};

export const termsSchema = ({ today }) => z.any().superRefine((values, ctx) => checkTerms(values, ctx, { today }));

export const loanFormSchema = ({ today }) =>
  z.any().superRefine((values, ctx) => {
    if (!values.clientId) addIssue(ctx, 'clientId', 'Elija el cliente.');
    if (!values.coDebtorId) addIssue(ctx, 'coDebtorId', 'Elija el codeudor.');
    if (values.clientId && values.clientId === values.coDebtorId) addIssue(ctx, 'coDebtorId', 'El codeudor debe ser una persona distinta al cliente.');
    if (String(values.notes ?? '').length > 2000) addIssue(ctx, 'notes', 'Máximo 2000 caracteres.');
    checkTerms(values, ctx, { today });
  });

/** Form values → body of POST /loans/preview (money terms only). */
export const toTermsPayload = (values) => {
  const common = { frequency: values.frequency, principalAmount: values.principalAmount, startDate: values.startDate };
  const installments = parseInteger(values.numberOfInstallments);
  if (values.frequency === 'biweekly') {
    return { ...common, installmentAmount: values.installmentAmount, numberOfInstallments: installments };
  }
  const payload = { ...common, monthlyInterestRate: parseDecimal(values.monthlyInterestRate) };
  if (installments !== null) payload.numberOfInstallments = installments;
  const day = parseInteger(values.paymentDay);
  if (day !== null) payload.paymentDay = day;
  return payload;
};

/** Form values → body of POST /loans. */
export const toLoanPayload = (values) => ({
  ...toTermsPayload(values),
  clientId: values.clientId,
  coDebtorId: values.coDebtorId,
  notes: values.notes?.trim() || null,
});

/** Field names the API may report errors on (to show them under each input). */
export const LOAN_FIELDS = Object.keys(emptyLoanForm(''));
