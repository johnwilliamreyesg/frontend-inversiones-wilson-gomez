import { useState } from 'react';
import { Link } from 'react-router';
import { CalendarCheck, CalendarClock, HandCoins, MapPin, Phone, UserRound } from 'lucide-react';
import { useCollections, useUpcoming } from './collections.queries.js';
import { PaymentDialog } from '../payments/PaymentDialog.jsx';
import { useUrlFilters } from '../../hooks/useUrlFilters.js';
import { useAuth } from '../../auth/AuthProvider.jsx';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { Card, StatCard } from '../../components/ui/Card.jsx';
import { Button, buttonClasses } from '../../components/ui/Button.jsx';
import { SearchInput, SegmentedControl } from '../../components/ui/ListControls.jsx';
import { TextField } from '../../components/ui/Field.jsx';
import { Badge, EmptyState, ErrorState, LoadingState } from '../../components/ui/Feedback.jsx';
import { WhatsAppButton } from '../../components/ui/WhatsAppButton.jsx';
import { FREQUENCY } from '../../utils/labels.js';
import { formatDate, formatDays, formatMoney, phoneHref } from '../../utils/format.js';
import { collectionReminder, upcomingReminder } from '../../utils/whatsapp.js';
import { today as getToday } from '../../utils/dates.js';

const TAB_OPTIONS = [
  { value: 'today', label: 'Hoy' },
  { value: 'upcoming', label: 'Próximos' },
];

const VIEW_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'overdue', label: 'Solo atrasados' },
];

const DAYS_OPTIONS = [
  { value: '7', label: '7 días' },
  { value: '15', label: '15 días' },
  { value: '30', label: '30 días' },
];

/**
 * "Cobros": who has to pay today or is behind (Hoy), and who has to pay in
 * the next days, to remind them beforehand (Próximos). Made for the phone.
 */
export function CollectionsPage() {
  const today = getToday();
  const [filters, setFilters] = useUrlFilters({ tab: 'today', date: today, view: 'all', search: '', days: '7' });

  return (
    <>
      <PageHeader title="Cobros" subtitle={filters.tab === 'today' ? (filters.date === today ? `Hoy, ${formatDate(today)}` : formatDate(filters.date)) : 'Para recordar antes de la fecha'} />
      <div className="mb-4 max-w-xs">
        <SegmentedControl label="Sección" options={TAB_OPTIONS} value={filters.tab} onChange={(tab) => setFilters({ tab })} />
      </div>
      {filters.tab === 'upcoming' ? (
        <UpcomingView days={filters.days} onDaysChange={(days) => setFilters({ days })} />
      ) : (
        <TodayView filters={filters} setFilters={setFilters} today={today} />
      )}
    </>
  );
}

function TodayView({ filters, setFilters, today }) {
  const { can } = useAuth();
  const { data, error, isPending, refetch } = useCollections({
    date: filters.date === today ? undefined : filters.date,
    search: filters.search,
    onlyOverdue: filters.view === 'overdue' ? 'true' : undefined,
  });
  const [paying, setPaying] = useState(null);

  return (
    <>
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

      <PaymentDialog open={Boolean(paying)} onClose={() => setPaying(null)} loanId={paying?.loanId} clientName={paying?.clientName} />
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

      <div className="mt-3">
        <p className="text-xs text-slate-500">Por cobrar</p>
        <p className="tabular text-2xl font-bold text-slate-900">{formatMoney(row.amountDue)}</p>
        <p className="text-xs text-slate-500">
          {row.installmentsDue} cuota(s) · desde {formatDate(row.oldestDueDate)}
        </p>
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

      <ContactButtons row={row} message={collectionReminder(row)}>
        {canPay && (
          <Button icon={HandCoins} onClick={onPay}>
            Cobrar
          </Button>
        )}
      </ContactButtons>
    </article>
  );
}

/** Call + WhatsApp reminder (+ an extra action such as Cobrar). */
function ContactButtons({ row, message, children }) {
  return (
    <div className={`mt-4 grid gap-2 ${children ? 'grid-cols-3' : 'grid-cols-2'}`}>
      <a href={phoneHref(row.clientPhoneCountryCode, row.clientPhoneNumber)} className={buttonClasses({ variant: 'secondary', className: 'px-2' })} aria-label={`Llamar a ${row.clientName}`}>
        <Phone className="size-4 shrink-0" aria-hidden="true" />
        Llamar
      </a>
      <WhatsAppButton countryCode={row.clientPhoneCountryCode} phoneNumber={row.clientPhoneNumber} message={message} className="px-2" />
      {children}
    </div>
  );
}

/** Installments due in the next days: remind the client before the date. */
function UpcomingView({ days, onDaysChange }) {
  const { data, error, isPending, refetch } = useUpcoming({ days: Number(days) });
  const rows = data?.data ?? [];
  const total = rows.reduce((sum, row) => sum + Math.round(row.amountDue * 100), 0) / 100;

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <SegmentedControl label="Rango" options={DAYS_OPTIONS} value={days} onChange={onDaysChange} />
        {data && (
          <p className="text-sm text-slate-600">
            {rows.length} cuota(s) · <span className="tabular font-semibold text-slate-900">{formatMoney(total)}</span>
          </p>
        )}
      </div>
      {isPending ? (
        <LoadingState />
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : rows.length === 0 ? (
        <Card>
          <EmptyState icon={CalendarClock} title="No hay cuotas en estos días">
            Pruebe con un rango más largo.
          </EmptyState>
        </Card>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {rows.map((row) => (
            <li key={row.installmentId}>
              <UpcomingCard row={row} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function UpcomingCard({ row }) {
  return (
    <article className={`h-full rounded-xl bg-white p-4 shadow-sm ring-1 ${row.rescheduled ? 'ring-amber-200' : 'ring-slate-200'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link to={`/loans/${row.loanId}`} className="block truncate font-semibold text-slate-900 hover:underline">
            {row.clientName}
          </Link>
          <p className="text-xs text-slate-500">
            Crédito #{row.loanId} · Cuota #{row.installmentNumber} · {FREQUENCY[row.frequency]}
          </p>
        </div>
        {row.rescheduled ? <Badge tone="warning">Compromiso</Badge> : <Badge tone="info">{row.daysUntilDue === 1 ? 'Mañana' : `En ${row.daysUntilDue} días`}</Badge>}
      </div>
      <div className="mt-3">
        <p className="text-xs text-slate-500">Vence el {formatDate(row.dueDate)}</p>
        <p className="tabular text-2xl font-bold text-slate-900">{formatMoney(row.amountDue)}</p>
        {row.rescheduled && <p className="text-xs text-amber-700">Fecha reagendada · {row.daysUntilDue === 1 ? 'mañana' : `en ${row.daysUntilDue} días`}</p>}
      </div>
      <ContactButtons row={row} message={upcomingReminder(row)} />
    </article>
  );
}
