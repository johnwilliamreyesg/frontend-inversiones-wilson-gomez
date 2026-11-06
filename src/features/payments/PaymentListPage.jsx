import { useState } from 'react';
import { Link } from 'react-router';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Undo2, Wallet } from 'lucide-react';
import { api } from '../../api/index.js';
import { VoidPaymentDialog } from './VoidPaymentDialog.jsx';
import { useUrlFilters } from '../../hooks/useUrlFilters.js';
import { useAuth } from '../../auth/AuthProvider.jsx';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { Card, StatCard } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { CheckboxField, SelectField, TextField } from '../../components/ui/Field.jsx';
import { Pagination } from '../../components/ui/ListControls.jsx';
import { Badge, EmptyState, ErrorState, LoadingState } from '../../components/ui/Feedback.jsx';
import { PAYMENT_METHOD, PAYMENT_TYPE } from '../../utils/labels.js';
import { formatDate, formatMoney } from '../../utils/format.js';
import { today as getToday } from '../../utils/dates.js';

/** Payments received in a date range: the daily cash count ("cuadre de caja"). */
export function PaymentListPage() {
  const today = getToday();
  const { can } = useAuth();
  const [filters, setFilters] = useUrlFilters({ from: today, to: today, paymentMethod: '', includeVoided: '', page: '1' });
  const query = {
    from: filters.from,
    to: filters.to,
    paymentMethod: filters.paymentMethod,
    includeVoided: filters.includeVoided || undefined,
    page: filters.page,
  };
  const { data, error, isPending, refetch } = useQuery({
    queryKey: ['payments', 'list', query],
    queryFn: () => api.payments.list(query),
    placeholderData: keepPreviousData,
  });
  const [voiding, setVoiding] = useState(null);
  const totals = data?.meta.totals;

  return (
    <>
      <PageHeader title="Pagos recibidos" subtitle="Cuadre de caja por fechas" />
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-[10rem_10rem_12rem_1fr] sm:items-end">
        <TextField label="Desde" type="date" max={today} value={filters.from} onChange={(event) => setFilters({ from: event.target.value })} />
        <TextField label="Hasta" type="date" max={today} value={filters.to} onChange={(event) => setFilters({ to: event.target.value })} />
        <SelectField label="Medio" value={filters.paymentMethod} onChange={(event) => setFilters({ paymentMethod: event.target.value })}>
          <option value="">Todos</option>
          <option value="cash">Efectivo</option>
          <option value="transfer">Transferencia</option>
        </SelectField>
        <CheckboxField
          className="self-center sm:pb-2.5"
          label="Mostrar anulados"
          checked={filters.includeVoided === 'true'}
          onChange={(event) => setFilters({ includeVoided: event.target.checked ? 'true' : '' })}
        />
      </div>

      {totals && (
        <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Total recibido" value={formatMoney(totals.amount)} hint={`${totals.count} pago(s)`} tone="brand" />
          <StatCard label="Interés (ganancia)" value={formatMoney(totals.interest)} tone="success" />
          <StatCard label="Capital recogido" value={formatMoney(totals.principal)} />
        </div>
      )}

      {isPending ? (
        <LoadingState />
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : data.data.length === 0 ? (
        <Card>
          <EmptyState icon={Wallet} title="No hay pagos en estas fechas" />
        </Card>
      ) : (
        <>
          <Card padded={false}>
            <ul className="divide-y divide-slate-100">
              {data.data.map((payment) => (
                <li key={payment.id} className={`flex items-start gap-3 px-4 py-3 ${payment.voidedAt ? 'bg-slate-50' : ''}`}>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2">
                      <span className={`tabular font-semibold ${payment.voidedAt ? 'text-slate-400 line-through' : ''}`}>{formatMoney(payment.amount)}</span>
                      <Link to={`/loans/${payment.loanId}`} className="truncate text-brand-700 hover:underline">
                        {payment.clientName} · #{payment.loanId}
                      </Link>
                      {payment.paymentType !== 'installment' && <Badge tone="info">{PAYMENT_TYPE[payment.paymentType]}</Badge>}
                      {payment.voidedAt && <Badge tone="danger">Anulado</Badge>}
                    </p>
                    <p className="text-sm text-slate-500">
                      {formatDate(payment.paymentDate)} · {PAYMENT_METHOD[payment.paymentMethod]} · Recibió {payment.receivedByName ?? '—'}
                    </p>
                    {payment.voidedAt && <p className="text-sm text-red-700">Motivo: {payment.voidReason}</p>}
                  </div>
                  {can('payments.void') && !payment.voidedAt && (
                    <Button variant="ghost" size="sm" icon={Undo2} onClick={() => setVoiding(payment)}>
                      Anular
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </Card>
          <Pagination meta={data.meta} onPageChange={(page) => setFilters({ page })} />
        </>
      )}
      <VoidPaymentDialog payment={voiding} onClose={() => setVoiding(null)} />
    </>
  );
}
