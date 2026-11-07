import { formatMoney, formatPercent } from '../../utils/format.js';

/** Monthly loan without a number of installments: interest only, principal paid freely. */
export const isOpenEnded = (loan) => loan.frequency === 'monthly' && !loan.numberOfInstallments;

/** One line describing the agreed terms, e.g. "10 cuotas quincenales de $ 120.000". */
export const describeTerms = (loan) => {
  if (loan.frequency === 'biweekly') {
    return `${loan.numberOfInstallments} cuotas quincenales de ${formatMoney(loan.installmentAmount)}`;
  }
  const rate = `${formatPercent(loan.monthlyInterestRate)} mensual`;
  return isOpenEnded(loan) ? `${rate} · sin plazo fijo` : `${rate} · ${loan.numberOfInstallments} cuotas mensuales`;
};

/** Paid-off loans, most recently finished first. */
export const paidLoans = (loans, { excludeId } = {}) =>
  loans
    .filter((loan) => loan.status === 'paid_off' && loan.id !== excludeId)
    .sort((a, b) => String(b.paidOffDate ?? '').localeCompare(String(a.paidOffDate ?? '')));
