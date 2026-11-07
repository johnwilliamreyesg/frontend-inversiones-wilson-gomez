import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '../../api/index.js';
import { useUrlFilters } from '../../hooks/useUrlFilters.js';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { Card, StatCard } from '../../components/ui/Card.jsx';
import { SegmentedControl } from '../../components/ui/ListControls.jsx';
import { TextField } from '../../components/ui/Field.jsx';
import { Badge, ErrorState, LoadingState } from '../../components/ui/Feedback.jsx';
import { formatDate, formatMoney, formatMonth, formatPercent } from '../../utils/format.js';
import { addMonthsToMonth, endOfMonth, today as getToday } from '../../utils/dates.js';

const VIEWS = [
  { value: 'daily', label: 'Día a día' },
  { value: 'monthly', label: 'Mes a mes' },
];

export function ReportsPage() {
  const today = getToday();
  const [filters, setFilters] = useUrlFilters({ view: 'daily', month: today.slice(0, 7), year: today.slice(0, 4) });

  return (
    <>
      <PageHeader title="Reportes" subtitle="Excluyen pagos anulados, créditos cancelados y gastos eliminados." />
      <div className="mb-4">
        <SegmentedControl label="Vista" options={VIEWS} value={filters.view} onChange={(view) => setFilters({ view })} />
      </div>
      {filters.view === 'daily' ? (
        <DailyReport month={filters.month} today={today} onMonthChange={(month) => setFilters({ month })} />
      ) : (
        <MonthlyReport year={Number(filters.year)} today={today} onYearChange={(year) => setFilters({ year })} />
      )}
    </>
  );
}

function Totals({ totals }) {
  return (
    <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard label="Ganancia (intereses)" value={formatMoney(totals.interestCollected)} tone="success" />
      <StatCard label="Capital recogido" value={formatMoney(totals.principalCollected)} hint={`Total cobrado ${formatMoney(totals.totalCollected)}`} />
      <StatCard label="Colocación (prestado)" value={formatMoney(totals.disbursed)} hint={`${totals.loansCreated} crédito(s)`} tone="brand" />
      <StatCard
        label="Ganancia neta"
        value={formatMoney(totals.netProfit)}
        hint={`Intereses − gastos (${formatMoney(totals.expenses)})`}
        tone={totals.netProfit < 0 ? 'danger' : 'success'}
      />
    </div>
  );
}

const MONEY_COLUMNS = [
  { key: 'interestCollected', label: 'Intereses' },
  { key: 'principalCollected', label: 'Capital' },
  { key: 'disbursed', label: 'Prestado' },
  { key: 'expenses', label: 'Gastos' },
  { key: 'netProfit', label: 'Neta' },
];

function DailyReport({ month, today, onMonthChange }) {
  const from = `${month}-01`;
  const lastDay = endOfMonth(from);
  const to = lastDay > today ? today : lastDay;
  const query = { from, to };
  const { data, error, isPending, refetch } = useQuery({
    queryKey: ['reports', 'daily', query],
    queryFn: () => api.reports.daily(query),
    placeholderData: keepPreviousData,
    enabled: from <= today,
  });
  const isCurrentMonth = month === today.slice(0, 7);

  return (
    <>
      <div className="mb-4 flex items-center gap-2">
        <button type="button" onClick={() => onMonthChange(addMonthsToMonth(month, -1))} className="rounded-lg p-2 ring-1 ring-inset ring-slate-300 hover:bg-white" aria-label="Mes anterior">
          <ChevronLeft className="size-4" />
        </button>
        <TextField type="month" aria-label="Mes" max={today.slice(0, 7)} value={month} onChange={(event) => event.target.value && onMonthChange(event.target.value)} />
        <button
          type="button"
          onClick={() => onMonthChange(addMonthsToMonth(month, 1))}
          disabled={isCurrentMonth}
          className="rounded-lg p-2 ring-1 ring-inset ring-slate-300 hover:bg-white disabled:opacity-40"
          aria-label="Mes siguiente"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
      {from > today ? (
        <p className="text-sm text-slate-500">Ese mes todavía no empieza.</p>
      ) : isPending ? (
        <LoadingState />
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : (
        <>
          <Totals totals={data.totals} />
          <Card title={`Detalle de ${formatMonth(month)}`} padded={false} collapsible>
            <ReportTable
              firstColumn="Día"
              rows={[...data.rows].reverse().filter((row) => row.paymentsCount || row.disbursed || row.expenses)}
              rowKey={(row) => row.date}
              rowLabel={(row) => formatDate(row.date)}
              emptyText="Sin movimientos en este mes."
            />
          </Card>
        </>
      )}
    </>
  );
}

function MonthlyReport({ year, today, onYearChange }) {
  const currentYear = Number(today.slice(0, 4));
  const { data, error, isPending, refetch } = useQuery({
    queryKey: ['reports', 'monthly', { year }],
    queryFn: () => api.reports.monthly({ year }),
    placeholderData: keepPreviousData,
  });

  return (
    <>
      <div className="mb-4 flex items-center gap-2">
        <button type="button" onClick={() => onYearChange(year - 1)} className="rounded-lg p-2 ring-1 ring-inset ring-slate-300 hover:bg-white" aria-label="Año anterior">
          <ChevronLeft className="size-4" />
        </button>
        <span className="tabular min-w-16 text-center text-lg font-semibold">{year}</span>
        <button
          type="button"
          onClick={() => onYearChange(year + 1)}
          disabled={year >= currentYear}
          className="rounded-lg p-2 ring-1 ring-inset ring-slate-300 hover:bg-white disabled:opacity-40"
          aria-label="Año siguiente"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
      {isPending ? (
        <LoadingState />
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : (
        <>
          <Totals totals={data.totals} />
          <Card title="Consolidado mensual" padded={false} collapsible>
            <ReportTable
              firstColumn="Mes"
              rows={data.rows.filter((row) => row.month <= today.slice(0, 7) || row.installmentsDue)}
              rowKey={(row) => row.month}
              rowLabel={(row) => formatMonth(row.month)}
              withEffectiveness
              currentMonth={today.slice(0, 7)}
              emptyText="Sin movimientos en este año."
            />
          </Card>
          <p className="mt-3 text-sm text-slate-500">
            <strong>Efectividad:</strong> de lo que vencía en el mes, cuánto se cobró dentro del mismo mes. Un pago atrasado que llega después no la mejora.
          </p>
        </>
      )}
    </>
  );
}

// Colour thresholds of the effectiveness badge (an assumption; adjust with Wilson).
const GOOD_EFFECTIVENESS = 90;
const FAIR_EFFECTIVENESS = 70;

/**
 * A month that has not started yet would always read 0 %: show a dash.
 * The current month is still running, so its value is marked "en curso".
 */
function EffectivenessBadge({ value, month, currentMonth }) {
  if (value === null || month > currentMonth) return <span className="text-slate-400">—</span>;
  const tone = value >= GOOD_EFFECTIVENESS ? 'success' : value >= FAIR_EFFECTIVENESS ? 'warning' : 'danger';
  return (
    <span className="inline-flex items-center gap-1.5">
      {month === currentMonth && <span className="text-xs text-slate-500">en curso</span>}
      <Badge tone={tone}>{formatPercent(value)}</Badge>
    </span>
  );
}

function ReportTable({ firstColumn, rows, rowKey, rowLabel, withEffectiveness = false, currentMonth, emptyText }) {
  if (!rows.length) return <p className="px-4 py-8 text-center text-sm text-slate-500">{emptyText}</p>;
  return (
    <>
      <ReportCards rows={rows} rowKey={rowKey} rowLabel={rowLabel} withEffectiveness={withEffectiveness} currentMonth={currentMonth} />
      <ReportGrid firstColumn={firstColumn} rows={rows} rowKey={rowKey} rowLabel={rowLabel} withEffectiveness={withEffectiveness} currentMonth={currentMonth} />
    </>
  );
}

/** Phones: one card per day/month with every value, instead of a wide table. */
function ReportCards({ rows, rowKey, rowLabel, withEffectiveness, currentMonth }) {
  return (
    <ul className="divide-y divide-slate-100 sm:hidden">
      {rows.map((row) => {
        const empty = MONEY_COLUMNS.every(({ key }) => !row[key]);
        return (
          <li key={rowKey(row)} className="px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold text-slate-900">{rowLabel(row)}</p>
              {withEffectiveness && <EffectivenessBadge value={row.effectiveness} month={row.month} currentMonth={currentMonth} />}
            </div>
            {empty ? (
              <p className="mt-0.5 text-sm text-slate-400">Sin movimiento</p>
            ) : (
              <dl className="tabular mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                {MONEY_COLUMNS.map(({ key, label }) => (
                  <div key={key} className="flex justify-between gap-2">
                    <dt className="text-slate-500">{label}</dt>
                    <dd className={`font-medium ${key === 'netProfit' && row[key] < 0 ? 'text-red-700' : row[key] ? 'text-slate-900' : 'text-slate-300'}`}>
                      {formatMoney(row[key] ?? 0)}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function ReportGrid({ firstColumn, rows, rowKey, rowLabel, withEffectiveness, currentMonth }) {
  return (
    <div className="hidden overflow-x-auto sm:block">
      <table className="w-full min-w-[40rem] text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-2 font-medium">{firstColumn}</th>
            {MONEY_COLUMNS.map(({ key, label }) => (
              <th key={key} className="px-2 py-2 text-right font-medium">
                {label}
              </th>
            ))}
            {withEffectiveness && <th className="px-4 py-2 text-right font-medium">Efectividad</th>}
          </tr>
        </thead>
        <tbody className="tabular divide-y divide-slate-100">
          {rows.map((row) => (
            <tr key={rowKey(row)}>
              <td className="whitespace-nowrap px-4 py-2 font-medium">{rowLabel(row)}</td>
              {MONEY_COLUMNS.map(({ key }) => (
                <td key={key} className={`px-2 py-2 text-right ${key === 'netProfit' && row[key] < 0 ? 'text-red-700' : ''}`}>
                  {row[key] ? formatMoney(row[key]) : <span className="text-slate-300">0</span>}
                </td>
              ))}
              {withEffectiveness && (
                <td className="px-4 py-2 text-right" title={row.amountDue ? `${formatMoney(row.amountCollectedOnDue)} de ${formatMoney(row.amountDue)}` : undefined}>
                  <EffectivenessBadge value={row.effectiveness} month={row.month} currentMonth={currentMonth} />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
