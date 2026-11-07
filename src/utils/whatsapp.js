import { formatDate, formatMoney } from './format.js';
import { PAYMENT_METHOD } from './labels.js';

// WhatsApp messages to clients. The app only prepares the text and opens the
// chat (wa.me); the admin reviews it and presses Send. Pure functions, tested.
// WhatsApp formatting: *bold*, _italic_, one fact per line. No emojis: WhatsApp
// Desktop on Windows breaks them when the text comes through a wa.me link.

const BUSINESS = 'Inversiones Wilson Gómez';
const DEFAULT_COUNTRY_CODE = '+57';
const OPEN = new Set(['pending', 'partially_paid']);
const NBSP = ' ';

const digits = (text) => String(text ?? '').replace(/\D/g, '');
// Non-breaking space after "$": the amount never splits across two lines.
const money = (amount) => formatMoney(amount).replace(/\s/g, NBSP);
const bold = (text) => `*${text}*`;
/** "*Valor:* $ 354.438" — the label stands out, the value reads plainly. */
const fact = (label, value) => `${bold(`${label}:`)} ${value}`;
const capitalize = (word) => word.charAt(0).toLocaleUpperCase('es') + word.slice(1).toLocaleLowerCase('es');
const firstName = (fullName) => capitalize(String(fullName ?? '').trim().split(/\s+/)[0] || '');

/** Greeting, intro, facts, closing and signature, separated like a chat message. */
const message = ({ clientName, intro, facts, closing }) =>
  [`Hola ${firstName(clientName)},`, '', intro, '', ...facts, '', closing, `_${BUSINESS}_`].join('\n');

/** "https://wa.me/573001234567?text=..." — opens the chat with the text ready. */
export const whatsappUrl = (countryCode, phoneNumber, text) =>
  `https://wa.me/${digits(countryCode || DEFAULT_COUNTRY_CODE)}${digits(phoneNumber)}?text=${encodeURIComponent(text)}`;

/** [3] → "#3"; [3, 4, 5] → "#3 a #5"; [2, 5] → "#2 y #5". */
export const installmentList = (numbers) => {
  const sorted = [...numbers].sort((a, b) => a - b);
  if (sorted.length === 0) return '';
  if (sorted.length === 1) return `#${sorted[0]}`;
  const consecutive = sorted.every((number, index) => index === 0 || number === sorted[index - 1] + 1);
  if (consecutive) return `#${sorted[0]} a #${sorted.at(-1)}`;
  return `${sorted.slice(0, -1).map((n) => `#${n}`).join(', ')} y #${sorted.at(-1)}`;
};

const range = (first, last) => (first === last ? [first] : Array.from({ length: last - first + 1 }, (_, i) => first + i));

/**
 * Row of "Cobros del día": installments due today or overdue.
 * { clientName, amountDue, installmentsDue, firstInstallmentNumber, lastInstallmentNumber, oldestDueDate, isOverdue }
 */
export const collectionReminder = (row) => {
  const plural = row.installmentsDue > 1;
  const installments = fact(plural ? 'Cuotas' : 'Cuota', installmentList(range(row.firstInstallmentNumber, row.lastInstallmentNumber)));
  if (row.isOverdue) {
    return message({
      clientName: row.clientName,
      intro: 'Le recordamos que su crédito tiene un saldo vencido:',
      facts: [installments, fact('Vencida desde', formatDate(row.oldestDueDate)), fact('Valor pendiente', money(row.amountDue))],
      closing: 'Por favor comuníquese con nosotros para ponerse al día.',
    });
  }
  return message({
    clientName: row.clientName,
    intro: `Le recordamos que hoy vence el pago de ${plural ? 'sus cuotas' : 'su cuota'}:`,
    facts: [installments, fact('Vence', `hoy, ${formatDate(row.oldestDueDate)}`), fact('Valor', money(row.amountDue))],
    closing: 'Gracias por su puntualidad.',
  });
};

/**
 * An installment not due yet (the "Próximos" list or the loan detail).
 * { clientName, installmentNumber, dueDate, amountDue, rescheduled }
 */
export const upcomingReminder = (row) =>
  message({
    clientName: row.clientName,
    intro: row.rescheduled ? 'Le recordamos el compromiso de pago acordado:' : 'Le recordamos el pago de su cuota:',
    facts: [
      fact('Cuota', `#${row.installmentNumber}`),
      fact(row.rescheduled ? 'Nueva fecha' : 'Vence', formatDate(row.dueDate)),
      fact('Valor', money(row.amountDue)),
    ],
    closing: 'Gracias por su puntualidad.',
  });

/** From the loan detail: what is overdue, or else the next installment. Null when nothing is pending. */
export const loanReminder = (loan, today) => {
  const open = loan.installments.filter((row) => OPEN.has(row.status));
  const due = open.filter((row) => row.dueDate <= today);
  if (due.length > 0) {
    const numbers = due.map((row) => row.installmentNumber);
    return collectionReminder({
      clientName: loan.clientName,
      amountDue: due.reduce((sum, row) => sum + Math.round(row.amountRemaining * 100), 0) / 100,
      installmentsDue: due.length,
      firstInstallmentNumber: Math.min(...numbers),
      lastInstallmentNumber: Math.max(...numbers),
      oldestDueDate: due[0].dueDate,
      isOverdue: due.some((row) => row.dueDate < today),
    });
  }
  const next = open[0];
  if (!next) return null;
  const rescheduled = (loan.dueDateChanges ?? []).some((change) => change.installmentId === next.id && change.newDueDate === next.dueDate);
  return upcomingReminder({ clientName: loan.clientName, installmentNumber: next.installmentNumber, dueDate: next.dueDate, amountDue: next.amountRemaining, rescheduled });
};

/**
 * Receipt after a payment: what it covered, what is left and the next date.
 * `loan` is the loan detail AFTER the payment.
 */
export const paymentReceipt = ({ payment, loan }) => {
  const lines = [
    `Hola ${firstName(loan.clientName)},`,
    '',
    'Le confirmamos que recibimos su pago:',
    '',
    fact('Valor', money(payment.amount)),
    fact('Fecha', formatDate(payment.paymentDate)),
    fact('Medio', PAYMENT_METHOD[payment.paymentMethod] ?? payment.paymentMethod),
  ];

  const applied = payment.allocations.map((a) => {
    const onlyInterest = a.principalAmount === 0 && a.interestAmount > 0;
    return `- Cuota #${a.installmentNumber}: ${money(a.principalAmount + a.interestAmount)}${onlyInterest ? ' (intereses)' : ''}`;
  });
  const allocatedPrincipal = payment.allocations.reduce((sum, a) => sum + Math.round(a.principalAmount * 100), 0);
  const extraPrincipal = (Math.round(payment.principalAmount * 100) - allocatedPrincipal) / 100;
  if (extraPrincipal > 0) applied.push(`- Abono a capital: ${money(extraPrincipal)}`);
  if (applied.length > 0) lines.push('', bold('Se aplicó a:'), ...applied);

  const rescheduled = (payment.rescheduled ?? []).map(
    (change) => `El saldo de la cuota #${change.installmentNumber} quedó para el ${bold(formatDate(change.newDueDate))}.`,
  );
  if (rescheduled.length > 0) lines.push('', ...rescheduled);

  const counted = loan.installments.filter((row) => row.status !== 'cancelled');
  const open = counted.filter((row) => OPEN.has(row.status));
  const openEnded = loan.frequency === 'monthly' && !loan.numberOfInstallments;
  lines.push('');
  if (open.length === 0 && loan.principalBalance === 0) {
    lines.push(bold('¡Su crédito quedó pagado por completo!'));
  } else {
    lines.push(bold('Estado de su crédito:'));
    if (openEnded) {
      lines.push(fact('Saldo de capital', money(loan.principalBalance)));
    } else {
      lines.push(fact('Cuotas pagadas', `${counted.length - open.length} de ${counted.length}`));
      lines.push(fact('Pendientes', installmentList(open.map((row) => row.installmentNumber))));
    }
  }
  const next = open[0];
  if (next) {
    lines.push(fact('Próxima cuota', `#${next.installmentNumber} el ${formatDate(next.dueDate)} por ${money(next.amountRemaining)}`));
  }

  lines.push('', '¡Gracias por su pago!', `_${BUSINESS}_`);
  return lines.join('\n');
};
