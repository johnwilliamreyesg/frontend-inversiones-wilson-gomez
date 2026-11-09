import { Link } from 'react-router';
import { ChevronRight, Plus, Users } from 'lucide-react';
import { useClients } from './clients.queries.js';
import { useUrlFilters } from '../../hooks/useUrlFilters.js';
import { Can } from '../../auth/guards.jsx';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { Pagination, SearchInput } from '../../components/ui/ListControls.jsx';
import { Badge, EmptyState, ErrorState, LoadingState } from '../../components/ui/Feedback.jsx';
import { formatPhone } from '../../utils/format.js';

export function ClientListPage() {
  const [filters, setFilters] = useUrlFilters({ search: '', page: '1' });
  const { data, error, isPending, refetch } = useClients({ search: filters.search, page: filters.page });

  return (
    <>
      <PageHeader
        title="Clientes"
        subtitle={data ? `${data.meta.total} registrados` : null}
        actions={
          <Can permission="clients.create">
            <Button to="/clients/new" icon={Plus}>
              Nuevo cliente
            </Button>
          </Can>
        }
      />
      <SearchInput value={filters.search} onChange={(search) => setFilters({ search })} placeholder="Buscar por nombre, cédula o teléfono" className="mb-4" />

      {isPending ? (
        <LoadingState />
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : data.data.length === 0 ? (
        <Card>
          <EmptyState icon={Users} title={filters.search ? 'Ningún cliente coincide con la búsqueda' : 'Todavía no hay clientes'}>
            {filters.search ? 'Pruebe con otra parte del nombre o con la cédula.' : 'Registre el primero con el botón "Nuevo cliente".'}
          </EmptyState>
        </Card>
      ) : (
        <>
          <Card title={`Clientes (${data.meta.total})`} padded={false} collapsible>
            <ul className="divide-y divide-slate-100">
              {data.data.map((client) => (
                <li key={client.id}>
                  <Link to={`/clients/${client.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50">
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-50 text-sm font-bold text-brand-800">
                      {client.fullName.slice(0, 1).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="truncate font-medium text-slate-900">{client.fullName}</span>
                        {client.writtenOffAt && <Badge tone="danger">Castigado</Badge>}
                      </span>
                      <span className="block truncate text-sm text-slate-500">
                        CC {client.nationalId} · {formatPhone(client.phoneCountryCode, client.phoneNumber)}
                      </span>
                    </span>
                    <ChevronRight className="size-5 shrink-0 text-slate-400" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
          <Pagination meta={data.meta} onPageChange={(page) => setFilters({ page })} />
        </>
      )}
    </>
  );
}
