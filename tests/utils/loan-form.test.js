import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { emptyLoanForm, loanFormSchema, parseDecimal, parseInteger, termsSchema, toLoanPayload, toTermsPayload } from '../../src/features/loans/loan-form.js';
import { amountDueBy, paymentSuggestions } from '../../src/features/loans/loan-amounts.js';
import { describeTerms, paidLoans } from '../../src/features/loans/loan-terms.js';

const TODAY = '2026-10-31';
const biweekly = { ...emptyLoanForm(TODAY), principalAmount: 1_000_000, installmentAmount: 120_000, numberOfInstallments: '10' };
const monthly = { ...emptyLoanForm(TODAY), frequency: 'monthly', principalAmount: 2_000_000, monthlyInterestRate: '5', paymentDay: '' };

const issues = (schema, values) => {
  const result = schema.safeParse(values);
  return result.success ? {} : Object.fromEntries(result.error.issues.map((issue) => [issue.path[0], issue.message]));
};

describe('loan form', () => {
  it('parses decimals with comma or dot and rejects junk', () => {
    assert.equal(parseDecimal('2,5'), 2.5);
    assert.equal(parseDecimal('10'), 10);
    assert.equal(parseDecimal(''), null);
    assert.ok(Number.isNaN(parseDecimal('1.234')));
    assert.ok(Number.isNaN(parseDecimal('abc')));
    assert.equal(parseInteger('12'), 12);
    assert.ok(Number.isNaN(parseInteger('1.5')));
  });

  it('builds the biweekly payload with numbers', () => {
    assert.deepEqual(toTermsPayload(biweekly), {
      frequency: 'biweekly',
      principalAmount: 1_000_000,
      startDate: TODAY,
      installmentAmount: 120_000,
      numberOfInstallments: 10,
    });
  });

  it('leaves out optional monthly fields when empty (open-ended loan)', () => {
    assert.deepEqual(toTermsPayload(monthly), { frequency: 'monthly', principalAmount: 2_000_000, startDate: TODAY, monthlyInterestRate: 5 });
    assert.deepEqual(toTermsPayload({ ...monthly, numberOfInstallments: '12', paymentDay: '5' }), {
      frequency: 'monthly',
      principalAmount: 2_000_000,
      startDate: TODAY,
      monthlyInterestRate: 5,
      numberOfInstallments: 12,
      paymentDay: 5,
    });
  });

  it('adds the parties and turns empty notes into null', () => {
    const payload = toLoanPayload({ ...biweekly, clientId: 1, coDebtorId: 2, notes: '   ' });
    assert.equal(payload.clientId, 1);
    assert.equal(payload.coDebtorId, 2);
    assert.equal(payload.notes, null);
  });

  it('accepts complete terms and rejects incomplete ones', () => {
    assert.deepEqual(issues(termsSchema({ today: TODAY }), biweekly), {});
    assert.deepEqual(issues(termsSchema({ today: TODAY }), monthly), {});
    assert.ok(issues(termsSchema({ today: TODAY }), { ...biweekly, installmentAmount: null }).installmentAmount);
    assert.ok(issues(termsSchema({ today: TODAY }), { ...monthly, monthlyInterestRate: '' }).monthlyInterestRate);
  });

  it('applies the same rules as the backend', () => {
    const schema = termsSchema({ today: TODAY });
    assert.equal(issues(schema, { ...biweekly, installmentAmount: 90_000 }).installmentAmount, 'Las cuotas no alcanzan a cubrir el capital prestado.');
    assert.ok(issues(schema, { ...biweekly, startDate: '2026-11-01' }).startDate);
    assert.ok(issues(schema, { ...monthly, paymentDay: '32' }).paymentDay);
    assert.ok(issues(schema, { ...monthly, monthlyInterestRate: '150' }).monthlyInterestRate);
  });

  it('requires two different people to save', () => {
    const schema = loanFormSchema({ today: TODAY });
    assert.ok(issues(schema, biweekly).clientId);
    assert.equal(issues(schema, { ...biweekly, clientId: 3, coDebtorId: 3 }).coDebtorId, 'El codeudor debe ser una persona distinta al cliente.');
    assert.deepEqual(issues(schema, { ...biweekly, clientId: 3, coDebtorId: 4 }), {});
  });

  it('describes the terms in one line', () => {
    assert.match(describeTerms({ frequency: 'monthly', monthlyInterestRate: 5, numberOfInstallments: null }), /sin plazo fijo/);
    assert.match(describeTerms({ frequency: 'biweekly', numberOfInstallments: 10, installmentAmount: 120000 }), /^10 cuotas quincenales/);
  });
});

describe('payment suggestions', () => {
  const row = (number, dueDate, amountRemaining, status = 'pending') => ({ id: number, installmentNumber: number, dueDate, amountRemaining, status });
  const loan = {
    frequency: 'biweekly',
    numberOfInstallments: 4,
    principalBalance: 400_000,
    summary: { totalRemaining: 450_000.3 },
    installments: [row(1, '2026-10-15', 0, 'paid'), row(2, '2026-10-30', 70_000.1, 'partially_paid'), row(3, '2026-10-31', 120_000.2), row(4, '2026-11-14', 260_000)],
  };

  it('adds what is due up to today without float errors', () => {
    assert.equal(amountDueBy(loan.installments, '2026-10-31'), 190_000.3);
  });

  it('offers due, due + next and full payoff', () => {
    assert.deepEqual(paymentSuggestions(loan, '2026-10-31'), [
      { label: 'Lo vencido', amount: 190_000.3 },
      { label: 'Vencido + próxima', amount: 450_000.3 },
    ]);
  });

  it('open-ended loans pay off with due interest + principal balance', () => {
    const openEnded = {
      frequency: 'monthly',
      numberOfInstallments: null,
      principalBalance: 1_000_000,
      summary: { totalRemaining: 50_000 },
      installments: [row(1, '2026-10-20', 50_000), row(2, '2026-11-20', 50_000)],
    };
    assert.deepEqual(paymentSuggestions(openEnded, '2026-10-31'), [
      { label: 'Lo vencido', amount: 50_000 },
      { label: 'Vencido + próxima', amount: 100_000 },
      { label: 'Pagar todo', amount: 1_050_000 },
    ]);
  });
});

describe('paidLoans (client history)', () => {
  it('only paid-off loans, the most recently finished first, without the excluded one', () => {
    const loans = [
      { id: 1, status: 'paid_off', paidOffDate: '2026-03-01' },
      { id: 2, status: 'active', paidOffDate: null },
      { id: 3, status: 'paid_off', paidOffDate: '2026-09-15' },
      { id: 4, status: 'paid_off', paidOffDate: '2026-06-10' },
    ];
    assert.deepEqual(paidLoans(loans).map(({ id }) => id), [3, 4, 1]);
    assert.deepEqual(paidLoans(loans, { excludeId: 3 }).map(({ id }) => id), [4, 1]);
  });
});
