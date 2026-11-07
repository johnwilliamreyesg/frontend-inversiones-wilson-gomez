import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { collectionReminder, installmentList, loanReminder, paymentReceipt, upcomingReminder, whatsappUrl } from '../../src/utils/whatsapp.js';

// Non-breaking spaces become plain ones so the expectations stay readable.
const plain = (text) => text.replace(/ /g, ' ');
// Emojis outside the basic plane arrive broken ("�") in WhatsApp Desktop.
const hasEmoji = (text) => /[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}]/u.test(text);

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
  const upcoming = { clientName: 'JOHN REYES', installmentNumber: 2, dueDate: '2026-12-06', amountDue: 354_438 };

  it('one fact per line with bold labels, greeting and signature', () => {
    assert.equal(
      plain(upcomingReminder(upcoming)),
      [
        'Hola John,',
        '',
        'Le recordamos el pago de su cuota:',
        '',
        '*Cuota:* #2',
        '*Vence:* 6 dic 2026',
        '*Valor:* $ 354.438',
        '',
        'Gracias por su puntualidad.',
        '_Inversiones Wilson Gómez_',
      ].join('\n'),
    );
  });

  it('the amount never splits: "$" and the number are joined by a non-breaking space', () => {
    assert.match(upcomingReminder(upcoming), /\$ 354\.438/);
  });

  it('a rescheduled one reads as the agreed commitment with its new date', () => {
    const text = plain(upcomingReminder({ ...upcoming, rescheduled: true }));
    assert.match(text, /compromiso de pago acordado:/);
    assert.match(text, /\*Nueva fecha:\* 6 dic 2026/);
  });

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
    assert.match(text, /^Hola Ana,/);
    assert.match(text, /saldo vencido:\n\n\*Cuotas:\* #2 a #3\n\*Vencida desde:\* 28 oct 2026\n\*Valor pendiente:\* \$ 720\.000/);
    assert.match(text, /ponerse al día\.\n_Inversiones Wilson Gómez_$/);
  });

  it('due today is not "vencida"', () => {
    const text = plain(collectionReminder({ clientName: 'Ana', amountDue: 360_000, installmentsDue: 1, firstInstallmentNumber: 3, lastInstallmentNumber: 3, oldestDueDate: '2026-11-06', isOverdue: false }));
    assert.match(text, /hoy vence el pago de su cuota:\n\n\*Cuota:\* #3\n\*Vence:\* hoy, 6 nov 2026/);
    assert.doesNotMatch(text, /vencid/i);
  });

  it('from the loan detail: overdue first, else the next one; nothing pending -> null', () => {
    const loan = {
      clientName: 'Ana',
      installments: [row(1, 1, '2026-10-01', 360_000, 'paid'), row(2, 2, '2026-11-01', 360_000), row(3, 3, '2026-12-01', 360_000)],
      dueDateChanges: [],
    };
    assert.match(plain(loanReminder(loan, '2026-11-06')), /\*Cuota:\* #2\n\*Vencida desde:\* 1 nov 2026/);
    assert.match(plain(loanReminder(loan, '2026-10-20')), /\*Cuota:\* #2\n\*Vence:\* 1 nov 2026/);
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
    assert.equal(
      plain(paymentReceipt({ payment, loan })),
      [
        'Hola Ana,',
        '',
        'Le confirmamos que recibimos su pago:',
        '',
        '*Valor:* $ 720.000',
        '*Fecha:* 6 nov 2026',
        '*Medio:* Efectivo',
        '',
        '*Se aplicó a:*',
        '- Cuota #1: $ 360.000',
        '- Cuota #2: $ 360.000',
        '',
        '*Estado de su crédito:*',
        '*Cuotas pagadas:* 2 de 4',
        '*Pendientes:* #3 a #4',
        '*Próxima cuota:* #3 el 1 dic 2026 por $ 360.000',
        '',
        '¡Gracias por su pago!',
        '_Inversiones Wilson Gómez_',
      ].join('\n'),
    );
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
    assert.match(text, /\*Medio:\* Transferencia/);
    assert.match(text, /- Cuota #2: \$ 60\.000 \(intereses\)/);
    assert.match(text, /El saldo de la cuota #2 quedó para el \*16 nov 2026\*\./);
    assert.match(text, /\*Próxima cuota:\* #2 el 16 nov 2026 por \$ 300\.000/);
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
    assert.match(text, /- Abono a capital: \$ 600\.000/);
    assert.match(text, /\*¡Su crédito quedó pagado por completo!\*/);
    assert.doesNotMatch(text, /Próxima/);
  });

  it('open-ended loans show the principal balance instead of installments left', () => {
    const openEnded = { ...loan, numberOfInstallments: null, principalBalance: 1_500_000, installments: [row(1, 1, '2026-11-01', 100_000, 'paid'), row(2, 2, '2026-12-01', 75_000)] };
    const payment = { paymentDate: '2026-11-06', amount: 600_000, paymentMethod: 'cash', paymentType: 'principal', principalAmount: 500_000, allocations: [{ installmentNumber: 1, principalAmount: 0, interestAmount: 100_000 }] };
    const text = plain(paymentReceipt({ payment, loan: openEnded }));
    assert.match(text, /\*Saldo de capital:\* \$ 1\.500\.000/);
    assert.doesNotMatch(text, /Cuotas pagadas/);
  });
});

describe('no emojis in any message', () => {
  it('reminders and receipts use only characters every WhatsApp shows', () => {
    const texts = [
      upcomingReminder({ clientName: 'Ana', installmentNumber: 1, dueDate: '2026-12-01', amountDue: 1, rescheduled: true }),
      collectionReminder({ clientName: 'Ana', amountDue: 1, installmentsDue: 1, firstInstallmentNumber: 1, lastInstallmentNumber: 1, oldestDueDate: '2026-11-01', isOverdue: true }),
      paymentReceipt({
        payment: { paymentDate: '2026-11-06', amount: 1, paymentMethod: 'cash', principalAmount: 0, allocations: [], rescheduled: [{ installmentNumber: 1, newDueDate: '2026-12-01' }] },
        loan: { clientName: 'Ana', frequency: 'biweekly', numberOfInstallments: 1, principalBalance: 0, installments: [] },
      }),
    ];
    for (const text of texts) assert.equal(hasEmoji(text), false, text);
  });
});
