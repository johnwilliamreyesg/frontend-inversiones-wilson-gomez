// Preview of a payment agreement, with the same rule as the backend
// (agreement-schedule.js): up to the principal owed is principal, the excess
// is interest, the principal not covered is forgiven. Pure (tested).

const toCents = (value) => Math.round(value * 100);
const fromCents = (cents) => cents / 100;

export const agreementPreview = ({ principalBalance, agreedAmount, numberOfInstallments }) => {
  if (!agreedAmount || !numberOfInstallments || numberOfInstallments < 1) return null;
  const balance = toCents(principalBalance);
  const agreed = toCents(agreedAmount);
  const principal = Math.min(agreed, balance);
  return {
    principal: fromCents(principal),
    interest: fromCents(agreed - principal),
    forgiven: fromCents(balance - principal),
    // Approximate installment (the last one takes the rounding remainder).
    installment: fromCents(Math.floor(agreed / numberOfInstallments / 100) * 100),
  };
};
