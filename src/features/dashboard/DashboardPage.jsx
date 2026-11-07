import { useQuery } from '@tanstack/react-query';
import { ArrowRight, HandCoins, Plus, UserPlus } from 'lucide-react';
import { api } from '../../api/index.js';
import { useAuth } from '../../auth/AuthProvider.jsx';
import { useCollections } from '../collections/collections.queries.js';
import { Card, StatCard } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { ErrorState } from '../../components/ui/Feedback.jsx';
import { formatDate, formatMoney } from '../../utils/format.js';
import { today as getToday } from '../../utils/dates.js';

/** Home: today's collections and, for whoever can see reports, the portfolio. */
export function DashboardPage() {
  const { user, can } = useAuth();
  const firstName = user.fullName.split(' ')[0];

  return (
    <>
      <div className="mb-5">
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Hola, {firstName}</h1>
        <p className="text-sm text-slate-500">{formatDate(getToday())}</p>
      </div>
      {/* Phones: the quick actions come first, reachable without scrolling. Desktop: at the end, as before. */}
      <div className="flex flex-col gap-5">
        {can('payments.read') && <TodaySection />}
        {can('reports.read') && <PortfolioSection />}
        <QuickActions can={can} className="order-first lg:order-none" />
      </div>
    </>
  );
}

function TodaySection() {
  const { data, error, refetch } = useCollections({});
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  const meta = data?.meta;
  return (
    <Card title="Hoy" actions={<Button size="sm" variant="secondary" to="/collections" icon={ArrowRight}>Ver cobros</Button>}>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Por cobrar" value={meta ? formatMoney(meta.amountDue) : '…'} hint={meta && `${meta.loans} crédito(s)`} tone="brand" />
        <StatCard label="Atrasados" value={meta ? meta.overdueLoans : '…'} tone={meta?.overdueLoans ? 'danger' : 'success'} />
        <StatCard label="Cobrado hoy" value={meta ? formatMoney(meta.collected.amount) : '…'} hint={meta && `${meta.collected.count} pago(s)`} tone="success" />
        <StatCard label="Interés cobrado hoy" value={meta ? formatMoney(meta.collected.interest) : '…'} />
      </div>
    </Card>
  );
}

function PortfolioSection() {
  const { data, error, refetch } = useQuery({ queryKey: ['reports', 'portfolio'], queryFn: () => api.reports.portfolio() });
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  return (
    <Card title="Cartera" actions={<Button size="sm" variant="secondary" to="/reports" icon={ArrowRight}>Reportes</Button>}>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Capital en la calle" value={data ? formatMoney(data.principalOutstanding) : '…'} tone="brand" />
        <StatCard label="Créditos abiertos" value={data ? data.openLoans : '…'} />
        <StatCard label="Valor en mora" value={data ? formatMoney(data.overdueAmount) : '…'} hint={data && `${data.overdueLoans} crédito(s)`} tone={data?.overdueAmount ? 'danger' : 'success'} />
        <StatCard label="Clientes" value={data ? data.clients : '…'} />
      </div>
    </Card>
  );
}

function QuickActions({ can, className = '' }) {
  const actions = [
    can('payments.read') && { to: '/collections', label: 'Cobrar', icon: HandCoins },
    can('loans.create') && { to: '/loans/new', label: 'Nuevo crédito', icon: Plus },
    can('clients.create') && { to: '/clients/new', label: 'Nuevo cliente', icon: UserPlus },
    can('expenses.create') && { to: '/expenses?new=1', label: 'Registrar gasto', icon: Plus },
  ].filter(Boolean);
  if (!actions.length) return null;
  return (
    <div className={`grid grid-cols-2 gap-3 sm:grid-cols-4 ${className}`}>
      {actions.map(({ to, label, icon }) => (
        <Button key={to} to={to} variant="secondary" icon={icon} className="h-12 px-2 sm:text-base">
          {label}
        </Button>
      ))}
    </div>
  );
}
