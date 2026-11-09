import { z } from 'zod';

// Pure helpers of the loan form (no React), so they can be unit-tested.

const MAX_INSTALLMENTS = 120;

// Biweekly collection days when left empty (15th and the last day of the month).
export const DEFAULT_COLLECTION_DAYS = [15, 30];
const MIN_DAYS_BETWEEN_COLLECTIONS = 7;

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
  numberOfInstallments: '',
  monthlyInterestRate: '',
  paymentDay: '',
  secondPaymentDay: '',
  notes: '',
});

const addIssue = (ctx, path, message) => ctx.addIssue({ code: 'custom', path: [path], message });

const isDayOfMonth = (day) => day === null || (!Number.isNaN(day) && day >= 1 && day <= 31);

/** The two biweekly collection days, empty ones replaced by the defaults. */
export const collectionDays = (values) => [
  parseInteger(values.paymentDay) ?? DEFAULT_COLLECTION_DAYS[0],
  parseInteger(values.secondPaymentDay) ?? DEFAULT_COLLECTION_DAYS[1],
];

/**
 * Validates the money terms only (what the preview needs). Same rules as
 * the backend's loan.validators.js; the backend checks again on save.
 */
const checkTerms = (values, ctx, { today }) => {
  if (!values.principalAmount) addIssue(ctx, 'principalAmount', 'Escriba el valor prestado.');
  if (!values.startDate) addIssue(ctx, 'startDate', 'Elija la fecha de desembolso.');
  else if (values.startDate > today) addIssue(ctx, 'startDate', 'La fecha de desembolso no puede ser futura.');

  // Both frequencies use a rate of the catalog (monthly; biweekly charges half per fortnight).
  const rate = parseDecimal(values.monthlyInterestRate);
  if (rate === null) addIssue(ctx, 'monthlyInterestRate', 'Elija la tasa de interés mensual.');
  else if (Number.isNaN(rate) || rate <= 0 || rate > 100) addIssue(ctx, 'monthlyInterestRate', 'Escriba una tasa entre 0 y 100 (máximo 2 decimales).');

  const installments = parseInteger(values.numberOfInstallments);
  const installmentsInvalid = Number.isNaN(installments) || (installments !== null && (installments < 1 || installments > MAX_INSTALLMENTS));
  if (installmentsInvalid) addIssue(ctx, 'numberOfInstallments', `Escriba un número entero entre 1 y ${MAX_INSTALLMENTS}.`);

  const day = parseInteger(values.paymentDay);
  if (!isDayOfMonth(day)) addIssue(ctx, 'paymentDay', 'El día debe estar entre 1 y 31.');

  if (values.frequency === 'biweekly') {
    if (installments === null) addIssue(ctx, 'numberOfInstallments', 'Escriba el número de cuotas (quincenas).');
    const second = parseInteger(values.secondPaymentDay);
    if (!isDayOfMonth(second)) addIssue(ctx, 'secondPaymentDay', 'El día debe estar entre 1 y 31.');
    else if (isDayOfMonth(day)) {
      const [first, last] = collectionDays(values);
      const gap = Math.abs(first - last);
      if (gap < MIN_DAYS_BETWEEN_COLLECTIONS || 31 - gap < MIN_DAYS_BETWEEN_COLLECTIONS) {
        addIssue(ctx, 'secondPaymentDay', 'Los dos días de cobro deben estar separados al menos 7 días (por ejemplo 15 y 30, o 5 y 20).');
      }
    }
  }
};

export const termsSchema = ({ today }) => z.any().superRefine((values, ctx) => checkTerms(values, ctx, { today }));

export const loanFormSchema = ({ today }) =>
  z.any().superRefine((values, ctx) => {
    if (!values.clientId) addIssue(ctx, 'clientId', 'Elija el cliente.');
    // The co-debtor is optional.
    if (values.clientId && values.clientId === values.coDebtorId) addIssue(ctx, 'coDebtorId', 'El codeudor debe ser una persona distinta al cliente.');
    if (String(values.notes ?? '').length > 2000) addIssue(ctx, 'notes', 'Máximo 2000 caracteres.');
    checkTerms(values, ctx, { today });
  });

/** Form values → body of POST /loans/preview (money terms only). */
export const toTermsPayload = (values) => {
  const payload = {
    frequency: values.frequency,
    principalAmount: values.principalAmount,
    startDate: values.startDate,
    monthlyInterestRate: parseDecimal(values.monthlyInterestRate),
  };
  const installments = parseInteger(values.numberOfInstallments);
  if (installments !== null) payload.numberOfInstallments = installments;
  if (values.frequency === 'biweekly') {
    [payload.paymentDay, payload.secondPaymentDay] = collectionDays(values);
    return payload;
  }
  const day = parseInteger(values.paymentDay);
  if (day !== null) payload.paymentDay = day;
  return payload;
};

/** Form values → body of POST /loans. */
export const toLoanPayload = (values) => ({
  ...toTermsPayload(values),
  clientId: values.clientId,
  coDebtorId: values.coDebtorId ?? null,
  notes: values.notes?.trim() || null,
});

/** Field names the API may report errors on (to show them under each input). */
export const LOAN_FIELDS = Object.keys(emptyLoanForm(''));
