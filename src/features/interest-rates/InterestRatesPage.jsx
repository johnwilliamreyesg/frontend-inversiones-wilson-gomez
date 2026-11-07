import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useInterestRates, useSaveInterestRate } from './interest-rates.queries.js';
import { parseDecimal } from '../loans/loan-form.js';
import { formatPercent } from '../../utils/format.js';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { TextField } from '../../components/ui/Field.jsx';
import { Badge, ErrorAlert, ErrorState, LoadingState } from '../../components/ui/Feedback.jsx';

/** "2,5" → 2.5 when it is a valid monthly rate; null otherwise. */
const validRate = (text) => {
  const rate = parseDecimal(text);
  return rate !== null && !Number.isNaN(rate) && rate > 0 && rate <= 100 ? rate : null;
};

/**
 * Monthly interest rates offered when a monthly loan is created. Rates are
 * never deleted: a deactivated one stops being offered, and loans that
 * already use it keep it (each loan stores its own rate).
 */
export function InterestRatesPage() {
  const { data: rates, error, isPending, refetch } = useInterestRates({ includeInactive: true });
  const save = useSaveInterestRate();
  const [newRate, setNewRate] = useState('');
  const rate = validRate(newRate);

  const create = (event) => {
    event.preventDefault();
    if (rate === null) return;
    save.mutate({ interestRate: { rate } }, { onSuccess: () => setNewRate('') });
  };

  return (
    <>
      <PageHeader title="Tasas de interés" subtitle="Las que se pueden elegir al crear un crédito mensual." />
      <div className="max-w-2xl space-y-5">
        <Card>
          <form onSubmit={create} className="flex items-end gap-2">
            <TextField
              className="flex-1"
              label="Nueva tasa mensual (%)"
              inputMode="decimal"
              placeholder="Ej.: 2,5"
              value={newRate}
              onChange={(event) => setNewRate(event.target.value)}
              error={newRate.trim() && rate === null ? 'Escriba una tasa entre 0 y 100 (máximo 2 decimales).' : null}
            />
            <Button type="submit" icon={Plus} loading={save.isPending && save.variables && !save.variables.id} disabled={rate === null}>
              Agregar
            </Button>
          </form>
        </Card>
        <ErrorAlert error={save.error} />
        {isPending ? (
          <LoadingState />
        ) : error ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : (
          <Card title={`Tasas (${rates.length})`} padded={false} collapsible>
            <ul className="divide-y divide-slate-100">
              {rates.map((interestRate) => (
                <li key={interestRate.id} className="flex items-center gap-3 px-4 py-2.5">
                  <span className={`tabular flex-1 font-medium ${interestRate.isActive ? 'text-slate-900' : 'text-slate-400'}`}>
                    {formatPercent(interestRate.rate)} mensual
                  </span>
                  {!interestRate.isActive && <Badge>Inactiva</Badge>}
                  <Button size="sm" variant="ghost" onClick={() => save.mutate({ id: interestRate.id, interestRate: { isActive: !interestRate.isActive } })}>
                    {interestRate.isActive ? 'Desactivar' : 'Activar'}
                  </Button>
                </li>
              ))}
            </ul>
          </Card>
        )}
        <p className="text-sm text-slate-500">Desactivar una tasa no cambia los créditos que ya la usan.</p>
      </div>
    </>
  );
}
