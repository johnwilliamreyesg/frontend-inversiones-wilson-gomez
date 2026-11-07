import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { collectionReminder, installmentList, loanReminder, paymentReceipt, upcomingReminder, whatsappUrl } from '../../src/utils/whatsapp.js';

const plain = (text) => text.replace(/\s/g, ' ');

const row = (id, installmentNumber, dueDate, amountDue, status = 'pending', amountPaid = 0) => ({
  id,
  installmentNumber,
  dueDate,
  amountDue,
  amountRemaining: status === 'paid' || status === 'cancelled' ? 0 : amountDue - amountPaid,
  status,
});

describe('whatsappUrl', () => {
  it('builds the wa.me link with the country code and the encoded text', () => {
    assert.equal(whatsappUrl('+57', '300 123 4567', 'Hola Ana'), 'https://wa.me/573001234567?text=Hola%20Ana');
  });

  it('uses Colombia when the client has no country code', () => {
    assert.match(whatsappUrl(null, '3001234567', 'x'), /^https:\/\/wa\.me\/573001234567/);
  });
});

describe('installmentList', () => {
  it('one, a range, or a list', () => {
    assert.equal(installmentList([3]), '#3');
    assert.equal(installmentList([5, 3, 4]), '#3 a #5');
    assert.equal(installmentList([2, 5, 7]), '#2, #5 y #7');
  });
});

describe('reminders', () => {
  it('overdue installments, from the collections list', () => {
    const text = plain(
      collectionReminder({
        clientName: 'Ana Pérez Gómez',
        amountDue: 720_000,
        installmentsDue: 2,
        firstInstallmentNumber: 2,
        lastInstallmentNumber: 3,
        oldestDueDate: '2026-10-28',
        isOverdue: true,
      }),
    );
    assert.match(text, /^Hola Ana, le saluda Inversiones Wilson Gómez\./);
    assert.match(text, /las cuotas #2 a #3 están vencidas desde el 28 oct 2026\. Valor pendiente: \$ 720\.000\./);
  });

  it('due today is not "vencida"', () => {
    const text = plain(collectionReminder({ clientName: 'Ana', amountDue: 360_000, installmentsDue: 1, firstInstallmentNumber: 3, lastInstallmentNumber: 3, oldestDueDate: '2026-11-06', isOverdue: false }));
    assert.match(text, /hoy vence su cuota #3 por \$ 360\.000\./);
  });

  it('upcoming, and a rescheduled one reads as the agreed commitment', () => {
    const base = { clientName: 'Ana', installmentNumber: 4, dueDate: '2026-11-16', amountDue: 300_000 };
    assert.match(plain(upcomingReminder(base)), /su cuota #4 por \$ 300\.000 vence el 16 nov 2026\./);
    assert.match(plain(upcomingReminder({ ...base, rescheduled: true })), /compromiso de pago acordado: su cuota #4 .* quedó para el 16 nov 2026\./);
  });

  it('from the loan detail: overdue first, else the next one; nothing pending -> null', () => {
    const loan = {
      clientName: 'Ana',
      installments: [row(1, 1, '2026-10-01', 360_000, 'paid'), row(2, 2, '2026-11-01', 360_000), row(3, 3, '2026-12-01', 360_000)],
      dueDateChanges: [],
    };
    assert.match(plain(loanReminder(loan, '2026-11-06')), /la cuota #2 está vencida desde el 1 nov 2026/);
    assert.match(plain(loanReminder(loan, '2026-10-20')), /su cuota #2 por \$ 360\.000 vence el 1 nov 2026/);
    assert.equal(loanReminder({ ...loan, installments: [row(1, 1, '2026-10-01', 1, 'paid')] }, '2026-11-06'), null);
  });
});

describe('paymentReceipt', () => {
  const loan = {
    clientName: 'Ana Pérez',
    frequency: 'monthly',
    numberOfInstallments: 4,
    principalBalance: 600_000,
    installments: [
      row(1, 1, '2026-10-01', 360_000, 'paid'),
      row(2, 2, '2026-11-01', 360_000, 'paid'),
      row(3, 3, '2026-12-01', 360_000),
      row(4, 4, '2027-01-01', 360_000),
    ],
  };

  it('says what it covered, how many are paid, which are left and the next date', () => {
    const payment = {
      paymentDate: '2026-11-06',
      amount: 720_000,
      paymentMethod: 'cash',
      paymentType: 'installment',
      principalAmount: 600_000,
      allocations: [
        { installmentNumber: 1, principalAmount: 300_000, interestAmount: 60_000 },
        { installmentNumber: 2, principalAmount: 300_000, interestAmount: 60_000 },
      ],
    };
    const text = plain(paymentReceipt({ payment, loan }));
    assert.match(text, /^Hola Ana, Inversiones Wilson Gómez le confirma el pago recibido el 6 nov 2026 por \$ 720\.000 \(efectivo\)\./);
    assert.match(text, /Se aplicó a: cuota #1 \(\$ 360\.000\), cuota #2 \(\$ 360\.000\)\./);
    assert.match(text, /Cuotas pagadas: 2 de 4\. Le quedan 2 cuotas: #3 a #4\./);
    assert.match(text, /Próxima cuota: #3 el 1 dic 2026 por \$ 360\.000\./);
  });

  it('interest only with the remainder moved to a new date', () => {
    const partly = { ...loan, installments: [row(1, 1, '2026-10-01', 360_000, 'paid'), row(2, 2, '2026-11-16', 360_000, 'partially_paid', 60_000), ...loan.installments.slice(2)] };
    const payment = {
      paymentDate: '2026-11-06',
      amount: 60_000,
      paymentMethod: 'transfer',
      paymentType: 'interest_only',
      principalAmount: 0,
      allocations: [{ installmentNumber: 2, principalAmount: 0, interestAmount: 60_000 }],
      rescheduled: [{ installmentNumber: 2, newDueDate: '2026-11-16' }],
    };
    const text = plain(paymentReceipt({ payment, loan: partly }));
    assert.match(text, /\(transferencia\)/);
    assert.match(text, /Abono de intereses a: cuota #2 \(\$ 60\.000\)\./);
    assert.match(text, /El saldo de la cuota #2 quedó para el 16 nov 2026\./);
    assert.match(text, /Próxima cuota: #2 el 16 nov 2026 por \$ 300\.000\./);
  });

  it('a prepayment shows the principal; a paid-off loan says so', () => {
    const payment = {
      paymentDate: '2026-11-06',
      amount: 1_020_000,
      paymentMethod: 'cash',
      paymentType: 'principal',
      principalAmount: 900_000,
      allocations: [{ installmentNumber: 3, principalAmount: 300_000, interestAmount: 120_000 }],
    };
    const paidOff = { ...loan, principalBalance: 0, installments: loan.installments.map((r) => ({ ...r, status: r.installmentNumber === 4 ? 'cancelled' : 'paid' })) };
    const text = plain(paymentReceipt({ payment, loan: paidOff }));
    assert.match(text, /Abono a capital: \$ 600\.000\./);
    assert.match(text, /quedó pagado por completo/);
    assert.doesNotMatch(text, /Próxima cuota/);
  });
});
