import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { Pencil, Plus, Receipt, Tags, Trash2 } from 'lucide-react';
import { useDeleteExpense, useExpenseCategories, useExpenses } from './expenses.queries.js';
import { ExpenseDialog } from './ExpenseDialog.jsx';
import { useUrlFilters } from '../../hooks/useUrlFilters.js';
import { useAuth } from '../../auth/AuthProvider.jsx';
import { Can } from '../../auth/guards.jsx';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { Card, StatCard } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { SelectField, TextField } from '../../components/ui/Field.jsx';
import { Pagination, SearchInput } from '../../components/ui/ListControls.jsx';
import { ConfirmDialog } from '../../components/ui/Modal.jsx';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/Feedback.jsx';
import { formatDate, formatMoney } from '../../utils/format.js';
import { endOfMonth, startOfMonth, today as getToday } from '../../utils/dates.js';

export function ExpenseListPage() {
  const today = getToday();
  const { can } = useAuth();
  const [params, setParams] = useSearchParams();
  const [filters, setFilters] = useUrlFilters({ from: startOfMonth(today), to: endOfMonth(today), categoryId: '', search: '', page: '1' });
  const { data, error, isPending, refetch } = useExpenses({
    from: filters.from,
    to: filters.to,
    categoryId: filters.categoryId,
    search: filters.search,
    page: filters.page,
  });
  const { data: categories = [] } = useExpenseCategories({ includeInactive: true });
  const remove = useDeleteExpense();
  // ?new=1 (quick action on the home screen) opens the form directly.
  const [editing, setEditing] = useState(() => (params.get('new') && can('expenses.create') ? { expense: null } : null));
  const [deleting, setDeleting] = useState(null);

  const closeEditor = () => {
    setEditing(null);
    if (params.get('new')) {
      params.delete('new');
      setParams(params, { replace: true });
    }
  };

  return (
    <>
      <PageHeader
        title="Gastos"
        actions={
          <>
            <Can permission="expenses.update">
              <Button variant="secondary" icon={Tags} to="/expenses/categories">
                Categorías
              </Button>
            </Can>
            <Can permission="expenses.create">
              <Button icon={Plus} onClick={() => setEditing({ expense: null })}>
                Registrar gasto
              </Button>
            </Can>
          </>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-[10rem_10rem_12rem_1fr] sm:items-end">
        <TextField label="Desde" type="date" value={filters.from} onChange={(event) => setFilters({ from: event.target.value })} />
        <TextField label="Hasta" type="date" value={filters.to} onChange={(event) => setFilters({ to: event.target.value })} />
        <SelectField label="Categoría" className="col-span-2 sm:col-span-1" value={filters.categoryId} onChange={(event) => setFilters({ categoryId: event.target.value })}>
          <option value="">Todas</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
              {category.isActive ? '' : ' (inactiva)'}
            </option>
          ))}
        </SelectField>
        <SearchInput className="col-span-2 sm:col-span-1" value={filters.search} onChange={(search) => setFilters({ search })} placeholder="Buscar en la descripción" />
      </div>

      {data && (
        <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Total en estas fechas" value={formatMoney(data.meta.totalAmount)} hint={`${data.meta.total} gasto(s)`} tone="danger" />
        </div>
      )}

      {isPending ? (
        <LoadingState />
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : data.data.length === 0 ? (
        <Card>
          <EmptyState icon={Receipt} title="No hay gastos en estas fechas" />
        </Card>
      ) : (
        <>
          <Card padded={false}>
            <ul className="divide-y divide-slate-100">
              {data.data.map((expense) => (
                <li key={expense.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-slate-900">{expense.description}</p>
                    <p className="text-sm text-slate-500">
                      {formatDate(expense.expenseDate)} · {expense.categoryName}
                    </p>
                  </div>
                  <span className="tabular font-semibold text-slate-900">{formatMoney(expense.amount)}</span>
                  <div className="flex">
                    <Can permission="expenses.update">
                      <button type="button" onClick={() => setEditing({ expense })} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Editar gasto">
                        <Pencil className="size-4" />
                      </button>
                    </Can>
                    <Can permission="expenses.delete">
                      <button type="button" onClick={() => setDeleting(expense)} className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-700" aria-label="Eliminar gasto">
                        <Trash2 className="size-4" />
                      </button>
                    </Can>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
          <Pagination meta={data.meta} onPageChange={(page) => setFilters({ page })} />
        </>
      )}

      <ExpenseDialog open={Boolean(editing)} expense={editing?.expense} onClose={closeEditor} />
      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => {
          setDeleting(null);
          remove.reset();
        }}
        onConfirm={() => remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}
        title="Eliminar gasto"
        confirmLabel="Eliminar"
        loading={remove.isPending}
        error={remove.error}
      >
        {deleting && (
          <p>
            «{deleting.description}» por <strong>{formatMoney(deleting.amount)}</strong> dejará de contar en los totales y reportes.
          </p>
        )}
      </ConfirmDialog>
    </>
  );
}
