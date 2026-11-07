import { formatDate, formatMoney } from './format.js';
import { PAYMENT_METHOD } from './labels.js';

// WhatsApp messages to clients. The app only prepares the text and opens the
// chat (wa.me); the admin reviews it and presses Send. Pure functions, tested.

const BUSINESS = 'Inversiones Wilson Gómez';
const DEFAULT_COUNTRY_CODE = '+57';
const OPEN = new Set(['pending', 'partially_paid']);

const digits = (text) => String(text ?? '').replace(/\D/g, '');
// formatMoney uses a non-breaking space; plain text is safer in a chat.
const money = (amount) => formatMoney(amount).replace(/\s/g, ' ');
const firstName = (fullName) => String(fullName ?? '').trim().split(/\s+/)[0] || '';
const greeting = (clientName) => `Hola ${firstName(clientName)}, le saluda ${BUSINESS}.`;

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
  const numbers = installmentList(range(row.firstInstallmentNumber, row.lastInstallmentNumber));
  const plural = row.installmentsDue > 1;
  const body = row.isOverdue
    ? `Le recordamos que ${plural ? `las cuotas ${numbers} están vencidas` : `la cuota ${numbers} está vencida`} desde el ${formatDate(row.oldestDueDate)}. Valor pendiente: ${money(row.amountDue)}. Por favor comuníquese con nosotros para ponerse al día.`
    : `Le recordamos que hoy vence ${plural ? `sus cuotas ${numbers}` : `su cuota ${numbers}`} por ${money(row.amountDue)}.`;
  return `${greeting(row.clientName)} ${body} ¡Gracias!`;
};

/**
 * An installment not due yet (the "Próximos" list or the loan detail).
 * { clientName, installmentNumber, dueDate, amountDue, rescheduled }
 */
export const upcomingReminder = (row) => {
  const body = row.rescheduled
    ? `Le recordamos el compromiso de pago acordado: su cuota #${row.installmentNumber} por ${money(row.amountDue)} quedó para el ${formatDate(row.dueDate)}.`
    : `Le recordamos que su cuota #${row.installmentNumber} por ${money(row.amountDue)} vence el ${formatDate(row.dueDate)}.`;
  return `${greeting(row.clientName)} ${body} ¡Gracias!`;
};

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
    `Hola ${firstName(loan.clientName)}, ${BUSINESS} le confirma el pago recibido el ${formatDate(payment.paymentDate)} por ${money(payment.amount)} (${(PAYMENT_METHOD[payment.paymentMethod] ?? '').toLowerCase()}).`,
  ];

  const applied = payment.allocations.map(
    (a) => `cuota #${a.installmentNumber} (${money(a.principalAmount + a.interestAmount)})`,
  );
  if (applied.length > 0) {
    lines.push(`${payment.paymentType === 'interest_only' ? 'Abono de intereses a' : 'Se aplicó a'}: ${applied.join(', ')}.`);
  }
  const allocatedPrincipal = payment.allocations.reduce((sum, a) => sum + Math.round(a.principalAmount * 100), 0);
  const extraPrincipal = (Math.round(payment.principalAmount * 100) - allocatedPrincipal) / 100;
  if (extraPrincipal > 0) lines.push(`Abono a capital: ${money(extraPrincipal)}.`);
  for (const change of payment.rescheduled ?? []) {
    lines.push(`El saldo de la cuota #${change.installmentNumber} quedó para el ${formatDate(change.newDueDate)}.`);
  }

  const counted = loan.installments.filter((row) => row.status !== 'cancelled');
  const open = counted.filter((row) => OPEN.has(row.status));
  const openEnded = loan.frequency === 'monthly' && !loan.numberOfInstallments;
  if (open.length === 0 && loan.principalBalance === 0) {
    lines.push('¡Su crédito quedó pagado por completo!');
  } else if (openEnded) {
    lines.push(`Saldo de capital: ${money(loan.principalBalance)}.`);
  } else {
    const paid = counted.length - open.length;
    lines.push(
      `Cuotas pagadas: ${paid} de ${counted.length}. ${open.length === 1 ? 'Le queda 1 cuota' : `Le quedan ${open.length} cuotas`}: ${installmentList(open.map((row) => row.installmentNumber))}.`,
    );
  }
  const next = open[0];
  if (next) lines.push(`Próxima cuota: #${next.installmentNumber} el ${formatDate(next.dueDate)} por ${money(next.amountRemaining)}.`);

  lines.push('¡Gracias por su pago!');
  return lines.join('\n');
};
