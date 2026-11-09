import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { hasFixedTerm, interestOnlySuggestions, principalPrepayment, splitPrepayment } from '../../src/features/loans/loan-amounts.js';
import { agreementPreview } from '../../src/features/write-offs/agreement.js';

const TODAY = '2026-11-06';

const row = (installmentNumber, dueDate, principalDue, interestDue, paid = {}) => {
  const principalPaid = paid.principal ?? 0;
  const interestPaid = paid.interest ?? 0;
  const amountPaid = principalPaid + interestPaid;
  return {
    installmentNumber,
    dueDate,
    principalDue,
    interestDue,
    amountDue: principalDue + interestDue,
    principalPaid,
    interestPaid,
    amountPaid,
    amountRemaining: principalDue + interestDue - amountPaid,
    status: amountPaid === 0 ? 'pending' : 'partially_paid',
  };
};

// Monthly 1.200.000 at 5 % in 4: installments 1 and 2 are due.
const fixedTerm = {
  frequency: 'monthly',
  numberOfInstallments: 4,
  principalBalance: 1_200_000,
  installments: [
    row(1, '2026-09-30', 300_000, 60_000),
    row(2, '2026-10-30', 300_000, 45_000),
    row(3, '2026-11-30', 300_000, 30_000),
    row(4, '2026-12-30', 300_000, 15_000),
  ],
};

describe('interestOnlySuggestions', () => {
  it('overdue interest, and the overdue plus the current month', () => {
    assert.deepEqual(interestOnlySuggestions(fixedTerm, TODAY), [
      { label: 'Intereses vencidos', amount: 105_000 },
      { label: 'Vencidos + del mes', amount: 135_000 },
    ]);
  });

  it('only the interest of the month when nothing is overdue', () => {
    const upToDate = { ...fixedTerm, installments: fixedTerm.installments.slice(2) };
    assert.deepEqual(interestOnlySuggestions(upToDate, TODAY), [{ label: 'Interés del mes', amount: 30_000 }]);
  });

  it('counts only the interest still unpaid', () => {
    const partly = { ...fixedTerm, installments: [row(1, '2026-10-30', 300_000, 45_000, { interest: 45_000 }), ...fixedTerm.installments.slice(2)] };
    assert.deepEqual(interestOnlySuggestions(partly, TODAY), [{ label: 'Interés del mes', amount: 30_000 }]);
  });
});

describe('principalPrepayment', () => {
  it('fixed term: the overdue part first; at most the principal of installments not paid at all', () => {
    assert.deepEqual(principalPrepayment(fixedTerm, TODAY), { overdue: 705_000, maxAmount: 1_305_000 });
  });

  it('a future installment partly paid ahead cannot be prepaid', () => {
    const paidAhead = { ...fixedTerm, installments: [...fixedTerm.installments.slice(0, 3), row(4, '2026-12-30', 300_000, 15_000, { interest: 15_000 })] };
    assert.equal(principalPrepayment(paidAhead, TODAY).maxAmount, 1_005_000);
  });

  it('open-ended: overdue interest plus the whole balance', () => {
    const openEnded = {
      frequency: 'monthly',
      numberOfInstallments: null,
      principalBalance: 2_000_000,
      installments: [row(1, '2026-10-30', 0, 100_000), row(2, '2026-11-30', 0, 100_000)],
    };
    assert.deepEqual(principalPrepayment(openEnded, TODAY), { overdue: 100_000, maxAmount: 2_100_000 });
    assert.equal(hasFixedTerm(openEnded), false);
    assert.equal(hasFixedTerm(fixedTerm), true);
    assert.equal(hasFixedTerm({ frequency: 'biweekly', numberOfInstallments: 10 }), true);
  });
});

describe('splitPrepayment', () => {
  it('covers the overdue part first, the rest lowers the principal', () => {
    assert.deepEqual(splitPrepayment(900_000, 705_000), { toOverdue: 705_000, toPrincipal: 195_000 });
    assert.deepEqual(splitPrepayment(100_000, 705_000), { toOverdue: 100_000, toPrincipal: 0 });
    assert.deepEqual(splitPrepayment(null, 0), { toOverdue: 0, toPrincipal: 0 });
  });

  it('no floating-point drift with cents', () => {
    assert.deepEqual(splitPrepayment(0.3, 0.1), { toOverdue: 0.1, toPrincipal: 0.2 });
  });
});

describe('agreementPreview (written-off loan)', () => {
  it('less than the balance: the rest of the principal is forgiven', () => {
    assert.deepEqual(agreementPreview({ principalBalance: 900_000, agreedAmount: 600_000, numberOfInstallments: 3 }), {
      principal: 600_000,
      interest: 0,
      forgiven: 300_000,
      installment: 200_000,
    });
  });

  it('more than the balance: the excess is interest', () => {
    const preview = agreementPreview({ principalBalance: 500_000, agreedAmount: 550_000, numberOfInstallments: 2 });
    assert.deepEqual([preview.principal, preview.interest, preview.forgiven], [500_000, 50_000, 0]);
  });

  it('nothing to show until amount and installments are set', () => {
    assert.equal(agreementPreview({ principalBalance: 1, agreedAmount: null, numberOfInstallments: 2 }), null);
    assert.equal(agreementPreview({ principalBalance: 1, agreedAmount: 10, numberOfInstallments: 0 }), null);
  });
});
