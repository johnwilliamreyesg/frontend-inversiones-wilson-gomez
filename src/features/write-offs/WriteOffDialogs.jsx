import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRenegotiate, useWriteOffClient } from './write-offs.queries.js';
import { agreementPreview } from './agreement.js';
import { applyServerErrors } from '../../utils/form-errors.js';
import { addDays, today as getToday } from '../../utils/dates.js';
import { formatMoney } from '../../utils/format.js';
import { Modal } from '../../components/ui/Modal.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { TextAreaField, TextField } from '../../components/ui/Field.jsx';
import { MoneyField } from '../../components/ui/MoneyField.jsx';
import { SegmentedControl } from '../../components/ui/ListControls.jsx';
import { Alert, ErrorAlert } from '../../components/ui/Feedback.jsx';

/** Send a client and all their open loans to the written-off portfolio. */
export function WriteOffClientDialog({ client, onClose, onDone }) {
  return (
    <Modal open={Boolean(client)} onClose={onClose} title="Castigar cartera">
      {client && <WriteOffClientForm client={client} onClose={onClose} onDone={onDone} />}
    </Modal>
  );
}

function WriteOffClientForm({ client, onClose, onDone }) {
  const writeOff = useWriteOffClient();
  const [generalError, setGeneralError] = useState(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(z.object({ reason: z.string().trim().min(5, 'Explique el motivo (mínimo 5 caracteres).').max(255, 'Máximo 255 caracteres.') })),
    defaultValues: { reason: '' },
  });

  const onSubmit = async ({ reason }) => {
    setGeneralError(null);
    try {
      await writeOff.mutateAsync({ clientId: client.id, reason });
      onDone?.();
      onClose();
    } catch (error) {
      if (!applyServerErrors(error, setError, ['reason'])) setGeneralError(error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <Alert tone="warning" title={client.fullName}>
        Todos sus créditos abiertos pasan a cartera castigada: salen de Cobros, de la cartera y de la efectividad del mes, y no reciben pagos.
        Si el cliente aparece, se puede hacer un acuerdo de pago desde Cartera castigada.
      </Alert>
      <ErrorAlert error={generalError} />
      <TextAreaField label="Motivo" required rows={3} placeholder="Ej.: se fue del país, quebró, no contesta" error={errors.reason?.message} {...register('reason')} />
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
          Volver
        </Button>
        <Button type="submit" variant="danger" loading={isSubmitting}>
          Castigar cartera
        </Button>
      </div>
    </form>
  );
}

const FREQUENCY_OPTIONS = [
  { value: 'monthly', label: 'Mensual' },
  { value: 'biweekly', label: 'Quincenal' },
];

const agreementSchema = (today) =>
  z.object({
    agreedAmount: z.number({ error: 'Escriba el valor acordado.' }).positive('El valor debe ser mayor que cero.'),
    numberOfInstallments: z.coerce.number({ error: 'Escriba el número de cuotas.' }).int('Número entero.').min(1, 'Mínimo 1 cuota.').max(120, 'Máximo 120 cuotas.'),
    frequency: z.enum(['monthly', 'biweekly']),
    firstDueDate: z.string().min(1, 'Elija la fecha.').refine((date) => date >= today, 'No puede ser en el pasado.'),
    notes: z.string().max(2000, 'Máximo 2000 caracteres.'),
  });

/**
 * New payment agreement for a written-off loan. `loan` needs
 * { id, clientName, principalBalance }; the preview shows what is forgiven.
 */
export function RenegotiateDialog({ loan, onClose, onDone }) {
  return (
    <Modal open={Boolean(loan)} onClose={onClose} title="Acuerdo de pago">
      {loan && <RenegotiateForm loan={loan} onClose={onClose} onDone={onDone} />}
    </Modal>
  );
}

function RenegotiateForm({ loan, onClose, onDone }) {
  const today = getToday();
  const renegotiate = useRenegotiate();
  const [generalError, setGeneralError] = useState(null);
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(agreementSchema(today)),
    defaultValues: { agreedAmount: loan.principalBalance, numberOfInstallments: '', frequency: 'monthly', firstDueDate: addDays(today, 30), notes: '' },
  });
  const values = useWatch({ control });
  const preview = agreementPreview({ principalBalance: loan.principalBalance, agreedAmount: values.agreedAmount, numberOfInstallments: Number(values.numberOfInstallments) });

  const onSubmit = async (agreement) => {
    setGeneralError(null);
    try {
      const updated = await renegotiate.mutateAsync({ loanId: loan.id, agreement: { ...agreement, notes: agreement.notes.trim() || null } });
      onDone?.(updated);
      onClose();
    } catch (error) {
      if (!applyServerErrors(error, setError, ['agreedAmount', 'numberOfInstallments', 'frequency', 'firstDueDate', 'notes'])) setGeneralError(error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <p className="text-sm text-slate-600">
        Crédito <strong>#{loan.id}</strong> · {loan.clientName} · debía <strong className="tabular">{formatMoney(loan.principalBalance)}</strong> de capital
      </p>
      <ErrorAlert error={generalError} />
      <Controller control={control} name="agreedAmount" render={({ field }) => <MoneyField label="Valor acordado (total a pagar)" required error={errors.agreedAmount?.message} {...field} />} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField label="Número de cuotas" required inputMode="numeric" error={errors.numberOfInstallments?.message} {...register('numberOfInstallments')} />
        <TextField label="Primera cuota" type="date" min={today} required error={errors.firstDueDate?.message} {...register('firstDueDate')} />
      </div>
      <Controller
        control={control}
        name="frequency"
        render={({ field }) => <SegmentedControl label="Frecuencia del acuerdo" options={FREQUENCY_OPTIONS} value={field.value} onChange={field.onChange} />}
      />
      {preview && (
        <dl className="tabular grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-3 text-sm ring-1 ring-inset ring-slate-200">
          <div>
            <dt className="text-slate-500">Cuotas de</dt>
            <dd className="font-semibold text-slate-900">≈ {formatMoney(preview.installment)}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Capital</dt>
            <dd className="font-semibold text-slate-900">{formatMoney(preview.principal)}</dd>
          </div>
          {preview.interest > 0 && (
            <div>
              <dt className="text-slate-500">Interés incluido</dt>
              <dd className="font-semibold text-emerald-700">{formatMoney(preview.interest)}</dd>
            </div>
          )}
          {preview.forgiven > 0 && (
            <div>
              <dt className="text-slate-500">Se perdona</dt>
              <dd className="font-semibold text-red-700">{formatMoney(preview.forgiven)}</dd>
            </div>
          )}
        </dl>
      )}
      <TextAreaField label="Notas del acuerdo" rows={2} placeholder="Ej.: pagará con la prima de diciembre" error={errors.notes?.message} {...register('notes')} />
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button type="submit" loading={isSubmitting}>
          Guardar acuerdo
        </Button>
      </div>
    </form>
  );
}
