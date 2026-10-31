import { Banknote, Plus } from 'lucide-react';
import { useLoans } from './loans.queries.js';
import { LoanRows } from './LoanRows.jsx';
import { useUrlFilters } from '../../hooks/useUrlFilters.js';
import { Can } from '../../auth/guards.jsx';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { Pagination, SearchInput, SegmentedControl } from '../../components/ui/ListControls.jsx';
import { SelectField } from '../../components/ui/Field.jsx';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/Feedback.jsx';

const STATUS_OPTIONS = [
  { value: 'active', label: 'Activos' },
  { value: 'paid_off', label: 'Pagados' },
  { value: 'cancelled', label: 'Cancelados' },
  { value: 'all', label: 'Todos' },
];

export function LoanListPage() {
  const [filters, setFilters] = useUrlFilters({ status: 'active', frequency: '', search: '', page: '1' });
  const { data, error, isPending, refetch } = useLoans({
    status: filters.status === 'all' ? undefined : filters.status,
    frequency: filters.frequency,
    search: filters.search,
    page: filters.page,
  });

  return (
    <>
      <PageHeader
        title="Créditos"
        subtitle={data ? `${data.meta.total} en esta vista` : null}
        actions={
          <Can permission="loans.create">
            <Button to="/loans/new" icon={Plus}>
              Nuevo crédito
            </Button>
          </Can>
        }
      />
      <div className="mb-4 space-y-3">
        <SegmentedControl label="Estado" options={STATUS_OPTIONS} value={filters.status} onChange={(status) => setFilters({ status })} />
        <div className="grid gap-3 sm:grid-cols-[1fr_12rem]">
          <SearchInput value={filters.search} onChange={(search) => setFilters({ search })} placeholder="Buscar por cliente o cédula" />
          <SelectField aria-label="Frecuencia" value={filters.frequency} onChange={(event) => setFilters({ frequency: event.target.value })}>
            <option value="">Todas las frecuencias</option>
            <option value="biweekly">Quincenal</option>
            <option value="monthly">Mensual</option>
          </SelectField>
        </div>
      </div>

      {isPending ? (
        <LoadingState />
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : data.data.length === 0 ? (
        <Card>
          <EmptyState icon={Banknote} title="No hay créditos en esta vista">
            Cambie los filtros o registre un crédito nuevo.
          </EmptyState>
        </Card>
      ) : (
        <>
          <Card padded={false}>
            <LoanRows loans={data.data} />
          </Card>
          <Pagination meta={data.meta} onPageChange={(page) => setFilters({ page })} />
        </>
      )}
    </>
  );
}
