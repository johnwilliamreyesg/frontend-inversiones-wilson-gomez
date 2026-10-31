import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle2 } from 'lucide-react';
import { useRegisterPayment } from '../loans/loans.queries.js';
import { applyServerErrors } from '../../utils/form-errors.js';
import { today as getToday } from '../../utils/dates.js';
import { formatDate, formatMoney } from '../../utils/format.js';
import { Modal } from '../../components/ui/Modal.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { MoneyField } from '../../components/ui/MoneyField.jsx';
import { TextAreaField, TextField } from '../../components/ui/Field.jsx';
import { SegmentedControl } from '../../components/ui/ListControls.jsx';
import { Alert, ErrorAlert } from '../../components/ui/Feedback.jsx';

const METHOD_OPTIONS = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'transfer', label: 'Transferencia' },
];

const paymentSchema = (today) =>
  z.object({
    amount: z.number({ error: 'Escriba el valor recibido.' }).positive('El valor debe ser mayor que cero.'),
    paymentMethod: z.enum(['cash', 'transfer']),
    paymentDate: z.string().min(1, 'Elija la fecha.').refine((date) => date <= today, 'La fecha no puede ser futura.'),
    notes: z.string().max(2000, 'Máximo 2000 caracteres.'),
  });

/**
 * Register a payment on a loan. Used from the loan detail and from the
 * collections list. `loan` needs { id, clientName }; `suggestions` are
 * quick-fill amounts like [{ label: 'Lo vencido', amount: 240000 }].
 */
export function PaymentDialog({ open, onClose, loan, suggestions = [], hint }) {
  return (
    <Modal open={open} onClose={onClose} title="Registrar pago">
      {/* Mounted only while open, so every opening starts with a clean form. */}
      {open && loan && <PaymentForm loan={loan} suggestions={suggestions} hint={hint} onClose={onClose} />}
    </Modal>
  );
}

function PaymentForm({ loan, suggestions, hint, onClose }) {
  const today = getToday();
  const register = useRegisterPayment();
  const [generalError, setGeneralError] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const {
    control,
    register: field,
    handleSubmit,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(paymentSchema(today)),
    defaultValues: { amount: null, paymentMethod: 'cash', paymentDate: today, notes: '' },
  });

  const onSubmit = async (values) => {
    setGeneralError(null);
    try {
      const payment = await register.mutateAsync({ loanId: loan.id, payment: { ...values, notes: values.notes.trim() || null } });
      setReceipt(payment);
    } catch (error) {
      if (!applyServerErrors(error, setError, ['amount', 'paymentMethod', 'paymentDate', 'notes'])) setGeneralError(error);
    }
  };

  if (receipt) return <PaymentReceipt payment={receipt} onClose={onClose} />;

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <p className="text-sm text-slate-600">
        Crédito <strong>#{loan.id}</strong> · {loan.clientName}
      </p>
      {hint && <Alert tone="info">{hint}</Alert>}
      <ErrorAlert error={generalError} />
      <Controller control={control} name="amount" render={({ field: amount }) => <MoneyField label="Valor recibido" required autoFocus error={errors.amount?.message} {...amount} />} />
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {suggestions.map(({ label, amount }) => (
            <button
              key={label}
              type="button"
              onClick={() => setValue('amount', amount, { shouldValidate: true })}
              className="rounded-full bg-slate-100 px-3 py-1.5 text-sm text-slate-700 ring-1 ring-inset ring-slate-200 hover:bg-slate-200"
            >
              {label}: <span className="tabular font-semibold">{formatMoney(amount)}</span>
            </button>
          ))}
        </div>
      )}
      <Controller
        control={control}
        name="paymentMethod"
        render={({ field: method }) => <SegmentedControl label="Medio de pago" options={METHOD_OPTIONS} value={method.value} onChange={method.onChange} />}
      />
      <TextField label="Fecha del pago" type="date" max={today} error={errors.paymentDate?.message} {...field('paymentDate')} />
      <TextAreaField label="Notas" rows={2} error={errors.notes?.message} {...field('notes')} />
      <div className="flex justify-end gap-2 pt-1">
        <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button type="submit" loading={isSubmitting}>
          Registrar pago
        </Button>
      </div>
    </form>
  );
}

/** What the payment covered, installment by installment. */
function PaymentReceipt({ payment, onClose }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-lg bg-emerald-50 p-3 text-emerald-900 ring-1 ring-inset ring-emerald-200">
        <CheckCircle2 className="size-6 shrink-0" aria-hidden="true" />
        <div>
          <p className="font-semibold">Pago registrado: {formatMoney(payment.amount)}</p>
          <p className="text-sm">
            Interés {formatMoney(payment.interestAmount)} · Capital {formatMoney(payment.principalAmount)}
          </p>
        </div>
      </div>
      <div>
        <p className="mb-2 text-sm font-medium text-slate-700">Se aplicó a:</p>
        <ul className="divide-y divide-slate-100 rounded-lg ring-1 ring-slate-200">
          {payment.allocations.map((allocation) => (
            <li key={allocation.installmentId} className="flex justify-between gap-3 px-3 py-2 text-sm">
              <span>
                Cuota {allocation.installmentNumber} <span className="text-slate-500">· vence {formatDate(allocation.dueDate)}</span>
              </span>
              <span className="tabular font-medium">{formatMoney(allocation.principalAmount + allocation.interestAmount)}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex justify-end">
        <Button onClick={onClose}>Listo</Button>
      </div>
    </div>
  );
}
