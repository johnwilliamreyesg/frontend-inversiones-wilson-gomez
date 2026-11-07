import { useState } from 'react';
import { Check, Pencil, Plus, X } from 'lucide-react';
import { useExpenseCategories, useSaveCategory } from './expenses.queries.js';
import { Can } from '../../auth/guards.jsx';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { TextField } from '../../components/ui/Field.jsx';
import { Badge, ErrorAlert, ErrorState, LoadingState } from '../../components/ui/Feedback.jsx';

const MIN_NAME = 2;

/**
 * Categories are never deleted (old expenses point to them): they are
 * deactivated and stop being offered for new expenses.
 */
export function ExpenseCategoriesPage() {
  const { data: categories, error, isPending, refetch } = useExpenseCategories({ includeInactive: true });
  const save = useSaveCategory();
  const [newName, setNewName] = useState('');
  const [editing, setEditing] = useState(null); // { id, name }

  const create = (event) => {
    event.preventDefault();
    if (newName.trim().length < MIN_NAME) return;
    save.mutate({ category: { name: newName.trim() } }, { onSuccess: () => setNewName('') });
  };

  const rename = () => {
    if (editing.name.trim().length < MIN_NAME) return;
    save.mutate({ id: editing.id, category: { name: editing.name.trim() } }, { onSuccess: () => setEditing(null) });
  };

  return (
    <>
      <PageHeader title="Categorías de gasto" backTo="/expenses" />
      <div className="max-w-2xl space-y-5">
        <Can permission="expenses.create">
          <Card>
            <form onSubmit={create} className="flex items-end gap-2">
              <TextField className="flex-1" label="Nueva categoría" value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="Ej.: Papelería" />
              <Button type="submit" icon={Plus} loading={save.isPending && !editing} disabled={newName.trim().length < MIN_NAME}>
                Agregar
              </Button>
            </form>
          </Card>
        </Can>
        <ErrorAlert error={save.error} />
        {isPending ? (
          <LoadingState />
        ) : error ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : (
          <Card title={`Categorías (${categories.length})`} padded={false} collapsible>
            <ul className="divide-y divide-slate-100">
              {categories.map((category) => (
                <li key={category.id} className="flex items-center gap-3 px-4 py-2.5">
                  {editing?.id === category.id ? (
                    <>
                      <input
                        autoFocus
                        aria-label="Nombre de la categoría"
                        value={editing.name}
                        onChange={(event) => setEditing({ ...editing, name: event.target.value })}
                        onKeyDown={(event) => event.key === 'Enter' && rename()}
                        className="h-9 flex-1 rounded-lg border-0 px-3 ring-1 ring-inset ring-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-600"
                      />
                      <button type="button" onClick={rename} className="rounded-lg p-2 text-emerald-700 hover:bg-emerald-50" aria-label="Guardar nombre">
                        <Check className="size-4" />
                      </button>
                      <button type="button" onClick={() => setEditing(null)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Cancelar">
                        <X className="size-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <span className={`flex-1 ${category.isActive ? 'text-slate-900' : 'text-slate-400'}`}>{category.name}</span>
                      {!category.isActive && <Badge>Inactiva</Badge>}
                      <Can permission="expenses.update">
                        <button type="button" onClick={() => setEditing({ id: category.id, name: category.name })} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label={`Renombrar ${category.name}`}>
                          <Pencil className="size-4" />
                        </button>
                        <Button size="sm" variant="ghost" onClick={() => save.mutate({ id: category.id, category: { isActive: !category.isActive } })}>
                          {category.isActive ? 'Desactivar' : 'Activar'}
                        </Button>
                      </Can>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </>
  );
}
