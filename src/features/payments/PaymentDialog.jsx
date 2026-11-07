import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle2 } from 'lucide-react';
import { useLoan, useRegisterPayment } from '../loans/loans.queries.js';
import {
  hasFixedTerm,
  interestOnlySuggestions,
  paymentSuggestions,
  principalPrepayment,
  splitPrepayment,
} from '../loans/loan-amounts.js';
import { isOpenEnded } from '../loans/loan-terms.js';
import { applyServerErrors } from '../../utils/form-errors.js';
import { addDays, today as getToday } from '../../utils/dates.js';
import { paymentReceipt } from '../../utils/whatsapp.js';
import { WhatsAppButton } from '../../components/ui/WhatsAppButton.jsx';
import { formatDate, formatMoney } from '../../utils/format.js';
import { PAYMENT_TYPE, RECALCULATION } from '../../utils/labels.js';
import { Modal } from '../../components/ui/Modal.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { MoneyField } from '../../components/ui/MoneyField.jsx';
import { TextAreaField, TextField } from '../../components/ui/Field.jsx';
import { SegmentedControl } from '../../components/ui/ListControls.jsx';
import { Alert, ErrorAlert, ErrorState, LoadingState } from '../../components/ui/Feedback.jsx';

const METHOD_OPTIONS = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'transfer', label: 'Transferencia' },
];

const TYPE_OPTIONS = Object.entries(PAYMENT_TYPE).map(([value, label]) => ({ value, label }));

const RECALCULATION_OPTIONS = [
  { value: 'reduce_installment', title: RECALCULATION.reduce_installment, description: 'Mismo número de cuotas, cada una más pequeña.' },
  { value: 'reduce_term', title: RECALCULATION.reduce_term, description: 'Las cuotas quedan iguales y se termina de pagar antes.' },
];

const FORM_FIELDS = ['amount', 'paymentMethod', 'paymentDate', 'notes', 'paymentType', 'recalculation', 'rescheduleTo'];

/** Whether a prepayment of this amount changes the installments still to come. */
const needsRecalculation = (loan, values, today) =>
  values.paymentType === 'principal' &&
  hasFixedTerm(loan) &&
  splitPrepayment(values.amount, principalPrepayment(loan, values.paymentDate || today).overdue).toPrincipal > 0;

const paymentSchema = (loan, today) =>
  z
    .object({
      amount: z.number({ error: 'Escriba el valor recibido.' }).positive('El valor debe ser mayor que cero.'),
      paymentType: z.enum(['installment', 'interest_only', 'principal']),
      recalculation: z.enum(['reduce_installment', 'reduce_term']).nullable(),
      paymentMethod: z.enum(['cash', 'transfer']),
      paymentDate: z.string().min(1, 'Elija la fecha.').refine((date) => date <= today, 'La fecha no puede ser futura.'),
      rescheduleTo: z.string(),
      notes: z.string().max(2000, 'Máximo 2000 caracteres.'),
    })
    .superRefine((values, ctx) => {
      if (values.paymentType === 'interest_only' && values.rescheduleTo && values.rescheduleTo <= values.paymentDate) {
        ctx.addIssue({ code: 'custom', path: ['rescheduleTo'], message: 'Debe ser posterior a la fecha del pago.' });
      }
      if (needsRecalculation(loan, values, today) && !values.recalculation) {
        ctx.addIssue({ code: 'custom', path: ['recalculation'], message: 'Elija qué pasa con las cuotas que faltan.' });
      }
    });

/** Form values → body of POST /loans/:id/payments. */
const toPaymentPayload = (loan, values, today) => ({
  amount: values.amount,
  paymentType: values.paymentType,
  ...(needsRecalculation(loan, values, today) && { recalculation: values.recalculation }),
  ...(values.paymentType === 'interest_only' && values.rescheduleTo && { rescheduleTo: values.rescheduleTo }),
  paymentMethod: values.paymentMethod,
  paymentDate: values.paymentDate,
  notes: values.notes.trim() || null,
});

/**
 * Register a payment on a loan, from the loan detail or the collections list.
 * It reads the loan detail (cached when coming from the loan page) to offer
 * the right amounts for each payment type.
 */
export function PaymentDialog({ open, onClose, loanId, clientName }) {
  return (
    <Modal open={open} onClose={onClose} title="Registrar pago">
      {/* Mounted only while open, so every opening starts with a clean form. */}
      {open && loanId && <PaymentDialogBody loanId={loanId} clientName={clientName} onClose={onClose} />}
    </Modal>
  );
}

function PaymentDialogBody({ loanId, clientName, onClose }) {
  const { data: loan, error, isPending, refetch } = useLoan(loanId);
  const [receipt, setReceipt] = useState(null);

  if (receipt) return <PaymentReceipt payment={receipt} loanId={loanId} onClose={onClose} />;
  if (isPending) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  return <PaymentForm loan={loan} clientName={clientName ?? loan.clientName} onClose={onClose} onRegistered={setReceipt} />;
}

function PaymentForm({ loan, clientName, onClose, onRegistered }) {
  const today = getToday();
  const register = useRegisterPayment();
  const [generalError, setGeneralError] = useState(null);
  const {
    control,
    register: field,
    handleSubmit,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(paymentSchema(loan, today)),
    defaultValues: { amount: null, paymentType: 'installment', recalculation: null, paymentMethod: 'cash', paymentDate: today, rescheduleTo: '', notes: '' },
  });

  const values = useWatch({ control });
  const date = values.paymentDate || today;
  const prepayment = principalPrepayment(loan, date);
  const suggestions = {
    installment: paymentSuggestions(loan, date),
    interest_only: interestOnlySuggestions(loan, date),
    principal: prepayment.maxAmount > 0 ? [{ label: 'Máximo', amount: prepayment.maxAmount }] : [],
  }[values.paymentType];

  const onSubmit = async (formValues) => {
    setGeneralError(null);
    try {
      onRegistered(await register.mutateAsync({ loanId: loan.id, payment: toPaymentPayload(loan, formValues, today) }));
    } catch (error) {
      if (!applyServerErrors(error, setError, FORM_FIELDS)) setGeneralError(error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <p className="text-sm text-slate-600">
        Crédito <strong>#{loan.id}</strong> · {clientName}
      </p>
      <ErrorAlert error={generalError} />

      <div className="space-y-2">
        <p className="text-sm font-medium text-slate-700">Tipo de pago</p>
        <Controller
          control={control}
          name="paymentType"
          render={({ field: type }) => <SegmentedControl label="Tipo de pago" options={TYPE_OPTIONS} value={type.value} onChange={type.onChange} />}
        />
        <PaymentTypeHelp loan={loan} type={values.paymentType} overdue={prepayment.overdue} />
      </div>

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

      {values.paymentType === 'principal' && values.amount > 0 && <PrepaymentSplit amount={values.amount} overdue={prepayment.overdue} />}

      {needsRecalculation(loan, values, today) && (
        <Controller
          control={control}
          name="recalculation"
          render={({ field: recalculation }) => (
            <RecalculationChoice value={recalculation.value} onChange={recalculation.onChange} error={errors.recalculation?.message} />
          )}
        />
      )}

      {values.paymentType === 'interest_only' && (
        <TextField
          label="Reagendar lo que queda de la cuota (opcional)"
          type="date"
          min={addDays(date, 1)}
          hint="Si el cliente acordó pagar el resto otro día. Esa fecha saldrá en Cobros y en Próximos para recordárselo."
          error={errors.rescheduleTo?.message}
          {...field('rescheduleTo')}
        />
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

function PaymentTypeHelp({ loan, type, overdue }) {
  const text = {
    installment: isOpenEnded(loan)
      ? 'Cubre el interés vencido; lo que sobre se abona a capital.'
      : 'Se aplica a la cuota más vieja: primero el interés y luego el capital.',
    interest_only: 'Solo cubre intereses (los vencidos y el del mes). El capital de esas cuotas sigue pendiente y la cuota sigue en mora.',
    principal:
      overdue > 0
        ? `Primero se cubre lo vencido (${formatMoney(overdue)}); lo demás baja el capital.`
        : 'Todo el valor baja el capital y, con él, los intereses que vienen.',
  }[type];
  return <p className="text-sm text-slate-500">{text}</p>;
}

function PrepaymentSplit({ amount, overdue }) {
  const { toOverdue, toPrincipal } = splitPrepayment(amount, overdue);
  return (
    <dl className="tabular grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-3 text-sm ring-1 ring-inset ring-slate-200">
      <div>
        <dt className="text-slate-500">Cubre lo vencido</dt>
        <dd className="font-semibold text-slate-900">{formatMoney(toOverdue)}</dd>
      </div>
      <div>
        <dt className="text-slate-500">Baja el capital</dt>
        <dd className="font-semibold text-brand-800">{formatMoney(toPrincipal)}</dd>
      </div>
    </dl>
  );
}

function RecalculationChoice({ value, onChange, error }) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium text-slate-700">
        ¿Qué pasa con las cuotas que faltan? <span className="text-red-600">*</span>
      </legend>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {RECALCULATION_OPTIONS.map((option) => (
          <label
            key={option.value}
            className={`flex cursor-pointer gap-3 rounded-lg p-3 ring-1 ring-inset ${
              value === option.value ? 'bg-brand-50 ring-2 ring-brand-600' : 'bg-white ring-slate-300 hover:bg-slate-50'
            }`}
          >
            <input
              type="radio"
              name="recalculation"
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="mt-0.5 size-4 accent-brand-700"
            />
            <span>
              <span className="block text-sm font-semibold text-slate-900">{option.title}</span>
              <span className="block text-sm text-slate-500">{option.description}</span>
            </span>
          </label>
        ))}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </fieldset>
  );
}

/** What the payment covered, installment by installment, and the WhatsApp receipt. */
function PaymentReceipt({ payment, loanId, onClose }) {
  // Refetched after the payment: the receipt must say what is left NOW.
  const { data: loan, isFetching } = useLoan(loanId);
  const allocatedPrincipal = payment.allocations.reduce((sum, allocation) => sum + Math.round(allocation.principalAmount * 100), 0);
  const extraPrincipal = (Math.round(payment.principalAmount * 100) - allocatedPrincipal) / 100;
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-lg bg-emerald-50 p-3 text-emerald-900 ring-1 ring-inset ring-emerald-200">
        <CheckCircle2 className="size-6 shrink-0" aria-hidden="true" />
        <div>
          <p className="font-semibold">
            {PAYMENT_TYPE[payment.paymentType] ?? 'Pago'} registrado: {formatMoney(payment.amount)}
          </p>
          <p className="text-sm">
            Interés {formatMoney(payment.interestAmount)} · Capital {formatMoney(payment.principalAmount)}
          </p>
        </div>
      </div>
      {payment.allocations.length > 0 && (
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
      )}
      {extraPrincipal > 0 && (
        <Alert tone="info">
          {formatMoney(extraPrincipal)} bajaron el capital.
          {payment.recalculation && ` Cuotas recalculadas: ${RECALCULATION[payment.recalculation].toLowerCase()}. Revise las cuotas nuevas en el crédito.`}
        </Alert>
      )}
      {payment.rescheduled?.length > 0 ? (
        <Alert tone="info">
          {payment.rescheduled.map((change) => `El saldo de la cuota #${change.installmentNumber} quedó para el ${formatDate(change.newDueDate)}.`).join(' ')}
        </Alert>
      ) : (
        payment.paymentType === 'interest_only' && <Alert tone="warning">El capital de las cuotas sigue pendiente.</Alert>
      )}
      <div className="flex flex-wrap justify-end gap-2">
        {loan && !isFetching && (
          <WhatsAppButton countryCode={loan.clientPhoneCountryCode} phoneNumber={loan.clientPhoneNumber} message={paymentReceipt({ payment, loan })}>
            Enviar comprobante por WhatsApp
          </WhatsAppButton>
        )}
        <Button onClick={onClose}>Listo</Button>
      </div>
    </div>
  );
}
