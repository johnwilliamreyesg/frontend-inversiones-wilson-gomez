import { useState } from 'react';
import { useVoidPayment } from '../loans/loans.queries.js';
import { formatDate, formatMoney } from '../../utils/format.js';
import { ConfirmDialog } from '../../components/ui/Modal.jsx';
import { TextAreaField } from '../../components/ui/Field.jsx';

const MIN_REASON_LENGTH = 5;

/** Void a payment: everything it paid is undone, but the record stays with the reason. */
export function VoidPaymentDialog({ payment, onClose }) {
  const voidPayment = useVoidPayment();
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);
  const tooShort = reason.trim().length < MIN_REASON_LENGTH;

  const close = () => {
    setReason('');
    setTouched(false);
    voidPayment.reset();
    onClose();
  };

  const confirm = () => {
    setTouched(true);
    if (tooShort) return;
    voidPayment.mutate({ paymentId: payment.id, reason: reason.trim() }, { onSuccess: close });
  };

  return (
    <ConfirmDialog
      open={Boolean(payment)}
      onClose={close}
      onConfirm={confirm}
      title="Anular pago"
      confirmLabel="Anular pago"
      loading={voidPayment.isPending}
      error={voidPayment.error}
    >
      {payment && (
        <>
          <p>
            Pago de <strong>{formatMoney(payment.amount)}</strong> del {formatDate(payment.paymentDate)}. Se devolverá a las cuotas y al saldo lo que pagó. El
            registro queda guardado como anulado.
          </p>
          <TextAreaField
            label="Motivo"
            required
            rows={2}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Ej.: se registró en el crédito equivocado"
            error={touched && tooShort ? `Explique el motivo (mínimo ${MIN_REASON_LENGTH} caracteres).` : null}
          />
        </>
      )}
    </ConfirmDialog>
  );
}
