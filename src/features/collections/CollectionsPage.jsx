import { useState } from 'react';
import { Link } from 'react-router';
import { CalendarCheck, HandCoins, MapPin, Phone, UserRound } from 'lucide-react';
import { useCollections } from './collections.queries.js';
import { PaymentDialog } from '../payments/PaymentDialog.jsx';
import { useUrlFilters } from '../../hooks/useUrlFilters.js';
import { useAuth } from '../../auth/AuthProvider.jsx';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { Card, StatCard } from '../../components/ui/Card.jsx';
import { Button, buttonClasses } from '../../components/ui/Button.jsx';
import { SearchInput, SegmentedControl } from '../../components/ui/ListControls.jsx';
import { TextField } from '../../components/ui/Field.jsx';
import { Badge, EmptyState, ErrorState, LoadingState } from '../../components/ui/Feedback.jsx';
import { FREQUENCY } from '../../utils/labels.js';
import { formatDate, formatDays, formatMoney, formatPhone, phoneHref } from '../../utils/format.js';
import { today as getToday } from '../../utils/dates.js';

const VIEW_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'overdue', label: 'Solo atrasados' },
];

/** "Cobros del día": who has to pay today or is behind, made for the collector's phone. */
export function CollectionsPage() {
  const today = getToday();
  const { can } = useAuth();
  const [filters, setFilters] = useUrlFilters({ date: today, view: 'all', search: '' });
  const { data, error, isPending, refetch } = useCollections({
    date: filters.date === today ? undefined : filters.date,
    search: filters.search,
    onlyOverdue: filters.view === 'overdue' ? 'true' : undefined,
  });
  const [paying, setPaying] = useState(null);

  return (
    <>
      <PageHeader title="Cobros del día" subtitle={filters.date === today ? `Hoy, ${formatDate(today)}` : formatDate(filters.date)} />

      {data && (
        <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Por cobrar" value={formatMoney(data.meta.amountDue)} hint={`${data.meta.loans} crédito(s)`} tone="brand" />
          <StatCard label="Atrasados" value={data.meta.overdueLoans} tone={data.meta.overdueLoans ? 'danger' : 'success'} />
          <StatCard label="Cobrado ese día" value={formatMoney(data.meta.collected.amount)} hint={`${data.meta.collected.count} pago(s)`} tone="success" />
          <StatCard label="Interés cobrado" value={formatMoney(data.meta.collected.interest)} />
        </div>
      )}

      <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_auto_11rem] sm:items-center">
        <SearchInput value={filters.search} onChange={(search) => setFilters({ search })} placeholder="Buscar por nombre, cédula o dirección" />
        <SegmentedControl label="Vista" options={VIEW_OPTIONS} value={filters.view} onChange={(view) => setFilters({ view })} />
        <TextField type="date" aria-label="Fecha" max={today} value={filters.date} onChange={(event) => setFilters({ date: event.target.value || today })} />
      </div>

      {isPending ? (
        <LoadingState />
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : data.data.length === 0 ? (
        <Card>
          <EmptyState icon={CalendarCheck} title={filters.search ? 'Nadie coincide con la búsqueda' : 'No hay cobros pendientes'}>
            {filters.search ? 'Pruebe con otra búsqueda.' : 'Todos los créditos están al día para esta fecha.'}
          </EmptyState>
        </Card>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {data.data.map((row) => (
            <li key={row.loanId}>
              <CollectionCard row={row} canPay={can('payments.create')} onPay={() => setPaying(row)} />
            </li>
          ))}
        </ul>
      )}

      <PaymentDialog
        open={Boolean(paying)}
        onClose={() => setPaying(null)}
        loan={paying && { id: paying.loanId, clientName: paying.clientName }}
        suggestions={paying ? [{ label: 'Lo vencido', amount: paying.amountDue }] : []}
      />
    </>
  );
}

function CollectionCard({ row, canPay, onPay }) {
  return (
    <article className={`h-full rounded-xl bg-white p-4 shadow-sm ring-1 ${row.isOverdue ? 'ring-red-200' : 'ring-slate-200'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link to={`/loans/${row.loanId}`} className="block truncate font-semibold text-slate-900 hover:underline">
            {row.clientName}
          </Link>
          <p className="text-xs text-slate-500">
            Crédito #{row.loanId} · {FREQUENCY[row.frequency]}
          </p>
        </div>
        {row.isOverdue ? <Badge tone="danger">{formatDays(row.daysOverdue)} de atraso</Badge> : <Badge tone="warning">Vence hoy</Badge>}
      </div>

      <div className="mt-3 flex items-end justify-between gap-3">
        <div>
          <p className="text-xs text-slate-500">Por cobrar</p>
          <p className="tabular text-2xl font-bold text-slate-900">{formatMoney(row.amountDue)}</p>
          <p className="text-xs text-slate-500">
            {row.installmentsDue} cuota(s) · desde {formatDate(row.oldestDueDate)}
          </p>
        </div>
      </div>

      <div className="mt-3 space-y-1 text-sm text-slate-600">
        {row.clientAddress && (
          <p className="flex gap-2">
            <MapPin className="mt-0.5 size-4 shrink-0 text-slate-400" aria-hidden="true" />
            {row.clientAddress}
          </p>
        )}
        <p className="flex gap-2">
          <UserRound className="mt-0.5 size-4 shrink-0 text-slate-400" aria-hidden="true" />
          Codeudor: {row.coDebtorName}
          {row.coDebtorPhoneNumber && (
            <a href={phoneHref(row.coDebtorPhoneCountryCode, row.coDebtorPhoneNumber)} className="text-brand-700 hover:underline">
              {row.coDebtorPhoneNumber}
            </a>
          )}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <a href={phoneHref(row.clientPhoneCountryCode, row.clientPhoneNumber)} className={buttonClasses({ variant: 'secondary' })} aria-label={`Llamar a ${row.clientName}`}>
          <Phone className="size-4" aria-hidden="true" />
          <span className="truncate">{formatPhone(null, row.clientPhoneNumber)}</span>
        </a>
        {canPay && (
          <Button icon={HandCoins} onClick={onPay}>
            Cobrar
          </Button>
        )}
      </div>
    </article>
  );
}
