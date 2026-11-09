import { formatMoney, formatPercent } from '../../utils/format.js';

/**
 * Monthly loan without a number of installments: interest only, principal
 * paid freely. A payment agreement (renegotiation) replaces that schedule.
 */
export const isOpenEnded = (loan) => loan.frequency === 'monthly' && !loan.numberOfInstallments && !loan.renegotiatedAt;

/** One line describing the agreed terms, e.g. "10 % mensual · 4 cuotas quincenales (días 15 y 30)". */
export const describeTerms = (loan) => {
  const rate = `${formatPercent(loan.monthlyInterestRate)} mensual`;
  if (loan.frequency === 'biweekly') {
    // Older biweekly loans had an agreed installment instead of a rate.
    if (!loan.monthlyInterestRate) return `${loan.numberOfInstallments} cuotas quincenales de ${formatMoney(loan.installmentAmount)}`;
    return `${rate} · ${loan.numberOfInstallments} cuotas quincenales (días ${loan.paymentDay} y ${loan.secondPaymentDay})`;
  }
  if (loan.renegotiatedAt && !loan.numberOfInstallments) return `${rate} · con acuerdo de pago`;
  return isOpenEnded(loan) ? `${rate} · sin plazo fijo` : `${rate} · ${loan.numberOfInstallments} cuotas mensuales`;
};

/** Paid-off loans, most recently finished first. */
export const paidLoans = (loans, { excludeId } = {}) =>
  loans
    .filter((loan) => loan.status === 'paid_off' && loan.id !== excludeId)
    .sort((a, b) => String(b.paidOffDate ?? '').localeCompare(String(a.paidOffDate ?? '')));
