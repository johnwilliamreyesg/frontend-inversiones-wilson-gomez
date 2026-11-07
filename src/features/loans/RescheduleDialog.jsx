import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRescheduleInstallment } from './loans.queries.js';
import { applyServerErrors } from '../../utils/form-errors.js';
import { formatDate, formatMoney } from '../../utils/format.js';
import { Modal } from '../../components/ui/Modal.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { CheckboxField, TextField } from '../../components/ui/Field.jsx';
import { ErrorAlert } from '../../components/ui/Feedback.jsx';

const schema = z.object({
  dueDate: z.string().min(1, 'Elija la nueva fecha.'),
  applyToFollowing: z.boolean(),
  reason: z.string().max(255, 'Máximo 255 caracteres.'),
});

/** Move an installment (and optionally the following ones) to a new date. */
export function RescheduleDialog({ loan, installment, onClose }) {
  return (
    <Modal open={Boolean(installment)} onClose={onClose} title="Cambiar fecha de pago">
      {installment && <RescheduleForm loan={loan} installment={installment} onClose={onClose} />}
    </Modal>
  );
}

function RescheduleForm({ loan, installment, onClose }) {
  const reschedule = useRescheduleInstallment();
  const [generalError, setGeneralError] = useState(null);
  const hasFollowing = loan.installments.some(
    (row) => row.installmentNumber > installment.installmentNumber && ['pending', 'partially_paid'].includes(row.status),
  );
  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema), defaultValues: { dueDate: installment.dueDate, applyToFollowing: false, reason: '' } });
  const applyToFollowing = watch('applyToFollowing');

  const onSubmit = async (values) => {
    setGeneralError(null);
    try {
      await reschedule.mutateAsync({
        loanId: loan.id,
        installmentId: installment.id,
        changes: { dueDate: values.dueDate, applyToFollowing: values.applyToFollowing, reason: values.reason.trim() || null },
      });
      onClose();
    } catch (error) {
      if (!applyServerErrors(error, setError, ['dueDate', 'applyToFollowing', 'reason'])) setGeneralError(error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <p className="text-sm text-slate-600">
        Cuota <strong>#{installment.installmentNumber}</strong> · {formatMoney(installment.amountRemaining)} por pagar · hoy vence el {formatDate(installment.dueDate)}
      </p>
      <ErrorAlert error={generalError} />
      <TextField label="Nueva fecha" type="date" min={loan.startDate} required autoFocus error={errors.dueDate?.message} {...register('dueDate')} />
      {hasFollowing && (
        <CheckboxField
          label="Mover también las cuotas siguientes"
          hint={
            applyToFollowing
              ? loan.frequency === 'monthly'
                ? 'Las siguientes quedan una por mes, ese mismo día, y pasa a ser el día de pago del crédito.'
                : 'Las siguientes quedan cada 15 días desde la nueva fecha.'
              : 'Solo se mueve esta cuota.'
          }
          {...register('applyToFollowing')}
        />
      )}
      <TextField label="Motivo (opcional)" placeholder="Ej.: le pagan el 30" error={errors.reason?.message} {...register('reason')} />
      <div className="flex justify-end gap-2 pt-1">
        <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button type="submit" loading={isSubmitting}>
          Guardar fecha
        </Button>
      </div>
    </form>
  );
}
