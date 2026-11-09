import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Archive, Handshake } from 'lucide-react';
import { useWrittenOff } from './write-offs.queries.js';
import { RenegotiateDialog } from './WriteOffDialogs.jsx';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { Card, StatCard } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/Feedback.jsx';
import { formatDate, formatDateTime, formatMoney } from '../../utils/format.js';
import { FREQUENCY } from '../../utils/labels.js';

/**
 * "Cartera castigada": clients that can no longer be collected, with what was
 * lost. Their loans are out of the monthly figures until a payment agreement
 * brings one back.
 */
export function WrittenOffPage() {
  const navigate = useNavigate();
  const { data, error, isPending, refetch } = useWrittenOff();
  const [negotiating, setNegotiating] = useState(null);

  return (
    <>
      <PageHeader title="Cartera castigada" subtitle="Clientes que ya no se pueden cobrar. No cuentan en los cálculos del mes." />
      {isPending ? (
        <LoadingState />
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
            <StatCard label="Capital perdido" value={formatMoney(data.meta.principalLost)} tone="danger" className="col-span-2 lg:col-span-1" />
            <StatCard label="Clientes" value={data.meta.clients} />
            <StatCard label="Créditos" value={data.meta.loans} />
          </div>
          {data.data.length === 0 ? (
            <Card>
              <EmptyState icon={Archive} title="No hay cartera castigada">
                Para castigar un cliente, ábralo y use "Castigar cartera".
              </EmptyState>
            </Card>
          ) : (
            <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {data.data.map((item) => (
                <li key={item.client.id}>
                  <WrittenOffClientCard item={item} onNegotiate={(loan) => setNegotiating({ ...loan, clientName: item.client.fullName })} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      <RenegotiateDialog loan={negotiating} onClose={() => setNegotiating(null)} onDone={(loan) => navigate(`/loans/${loan.id}`)} />
    </>
  );
}

function WrittenOffClientCard({ item, onNegotiate }) {
  const { client, loans } = item;
  return (
    <Card padded={false} title={client.fullName} collapsible actions={<span className="tabular text-sm font-semibold text-red-700">{formatMoney(item.principalLost)}</span>}>
      <div className="border-b border-slate-100 px-4 py-3 text-sm">
        <p className="text-slate-700">
          <span className="font-medium">Motivo:</span> {client.writeOffReason}
        </p>
        <p className="text-slate-500">
          Castigado el {formatDateTime(client.writtenOffAt)}
          {client.writtenOffByName && ` por ${client.writtenOffByName}`} ·{' '}
          <Link to={`/clients/${client.id}`} className="text-brand-700 hover:underline">
            Ver cliente
          </Link>
        </p>
      </div>
      <ul className="divide-y divide-slate-100">
        {loans.map((loan) => (
          <li key={loan.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <Link to={`/loans/${loan.id}`} className="font-medium text-brand-700 hover:underline">
                Crédito #{loan.id}
              </Link>
              <p className="tabular text-sm text-slate-600">
                Capital {formatMoney(loan.principalBalance)} · Debía {formatMoney(loan.amountOwed)}
              </p>
              <p className="text-xs text-slate-500">
                {FREQUENCY[loan.frequency]} · prestado {formatMoney(loan.principalAmount)} el {formatDate(loan.startDate)}
              </p>
            </div>
            <Button size="sm" icon={Handshake} onClick={() => onNegotiate(loan)}>
              Acuerdo de pago
            </Button>
          </li>
        ))}
      </ul>
    </Card>
  );
}
