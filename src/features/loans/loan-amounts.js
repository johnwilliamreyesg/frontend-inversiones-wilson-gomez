import { isOpenEnded } from './loan-terms.js';

// Money is added in whole cents to avoid floating-point drift (0.1 + 0.2).
const toCents = (value) => Math.round(value * 100);
const fromCents = (cents) => cents / 100;
const sumCents = (rows, pick) => rows.reduce((sum, row) => sum + toCents(pick(row)), 0);

const OPEN = new Set(['pending', 'partially_paid']);
const openRows = (installments) => installments.filter((row) => OPEN.has(row.status));
const dueRows = (installments, date) => openRows(installments).filter((row) => row.dueDate <= date);
const remainingInterest = (row) => row.interestDue - row.interestPaid;
const remainingPrincipal = (row) => row.principalDue - row.principalPaid;

/** Sum of what is still owed on the installments due on or before `date`. */
export const amountDueBy = (installments, date) => fromCents(sumCents(dueRows(installments, date), (row) => row.amountRemaining));

/** The next open installment due after `date`, or null. */
export const nextOpenInstallment = (installments, date) => openRows(installments).find((row) => row.dueDate > date) ?? null;

/** Fixed term = monthly with a number of installments, or biweekly. Only these recalculate after a prepayment. */
export const hasFixedTerm = (loan) => !isOpenEnded(loan);

/**
 * Quick-fill amounts for a regular installment payment: what is due today,
 * the next installment on top, and the full payoff.
 */
export const paymentSuggestions = (loan, date) => {
  const suggestions = [];
  const due = amountDueBy(loan.installments, date);
  if (due > 0) suggestions.push({ label: 'Lo vencido', amount: due });

  const next = nextOpenInstallment(loan.installments, date);
  if (next) {
    const amount = fromCents(toCents(due) + toCents(next.amountRemaining));
    suggestions.push({ label: due > 0 ? 'Vencido + próxima' : 'Próxima cuota', amount });
  }

  const payoff = isOpenEnded(loan) ? fromCents(toCents(due) + toCents(loan.principalBalance)) : loan.summary.totalRemaining;
  if (payoff > 0 && !suggestions.some((suggestion) => suggestion.amount === payoff)) {
    suggestions.push({ label: 'Pagar todo', amount: payoff });
  }
  return suggestions;
};

/**
 * "Solo intereses": the backend accepts the interest of the installments
 * already due plus the current one (the next not yet due).
 */
export const interestOnlySuggestions = (loan, date) => {
  const overdue = sumCents(dueRows(loan.installments, date), remainingInterest);
  const current = nextOpenInstallment(loan.installments, date);
  const currentInterest = current ? toCents(remainingInterest(current)) : 0;

  const suggestions = [];
  if (overdue > 0) suggestions.push({ label: 'Intereses vencidos', amount: fromCents(overdue) });
  if (currentInterest > 0) {
    suggestions.push({ label: overdue > 0 ? 'Vencidos + del mes' : 'Interés del mes', amount: fromCents(overdue + currentInterest) });
  }
  return suggestions;
};

/**
 * "Abono a capital": what is overdue (interest, then principal) is covered
 * first; the rest lowers the balance. `maxAmount` mirrors the backend limit:
 * in fixed-term loans only installments to come without any payment can be
 * prepaid (one partly paid ahead stays as agreed).
 */
export const principalPrepayment = (loan, date) => {
  const due = dueRows(loan.installments, date);
  const overdueCents = sumCents(due, remainingInterest) + sumCents(due, remainingPrincipal);
  const prepayableCents = isOpenEnded(loan)
    ? toCents(loan.principalBalance) - sumCents(due, remainingPrincipal)
    : sumCents(
        openRows(loan.installments).filter((row) => row.dueDate > date && row.amountPaid === 0),
        remainingPrincipal,
      );
  return { overdue: fromCents(overdueCents), maxAmount: fromCents(overdueCents + prepayableCents) };
};

/** How a prepayment of `amount` splits: what covers the overdue part and what lowers the principal. */
export const splitPrepayment = (amount, overdue) => {
  const amountCents = toCents(amount ?? 0);
  const overdueCents = Math.min(amountCents, toCents(overdue));
  return { toOverdue: fromCents(overdueCents), toPrincipal: fromCents(amountCents - overdueCents) };
};
