import { isOpenEnded } from './loan-terms.js';

// Money is added in whole cents to avoid floating-point drift (0.1 + 0.2).
const toCents = (value) => Math.round(value * 100);
const fromCents = (cents) => cents / 100;

const OPEN = new Set(['pending', 'partially_paid']);

/** Sum of what is still owed on the installments due on or before `date`. */
export const amountDueBy = (installments, date) =>
  fromCents(installments.filter((row) => OPEN.has(row.status) && row.dueDate <= date).reduce((sum, row) => sum + toCents(row.amountRemaining), 0));

/** The next open installment due after `date`, or null. */
export const nextOpenInstallment = (installments, date) => installments.find((row) => OPEN.has(row.status) && row.dueDate > date) ?? null;

/**
 * Quick-fill amounts for the payment form: what is due today, the next
 * installment on top, and the full payoff when the loan has a fixed term.
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
