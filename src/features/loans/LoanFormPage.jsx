import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCreateLoan, useLoanPreview } from './loans.queries.js';
import { useInterestRates } from '../interest-rates/interest-rates.queries.js';
import { LOAN_FIELDS, emptyLoanForm, loanFormSchema, termsSchema, toLoanPayload, toTermsPayload } from './loan-form.js';
import { useClient } from '../clients/clients.queries.js';
import { ClientPicker } from '../clients/ClientPicker.jsx';
import { NewClientDialog } from '../clients/NewClientDialog.jsx';
import { useAuth } from '../../auth/AuthProvider.jsx';
import { useDebouncedValue } from '../../hooks/useDebouncedValue.js';
import { applyServerErrors } from '../../utils/form-errors.js';
import { today as getToday } from '../../utils/dates.js';
import { formatDate, formatMoney, formatPercent } from '../../utils/format.js';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { SelectField, TextAreaField, TextField } from '../../components/ui/Field.jsx';
import { MoneyField } from '../../components/ui/MoneyField.jsx';
import { SegmentedControl } from '../../components/ui/ListControls.jsx';
import { Alert, ErrorAlert } from '../../components/ui/Feedback.jsx';
import { Spinner } from '../../components/ui/Spinner.jsx';

const FREQUENCY_OPTIONS = [
  { value: 'biweekly', label: 'Quincenal' },
  { value: 'monthly', label: 'Mensual' },
];

export function LoanFormPage() {
  const [params] = useSearchParams();
  const presetClientId = params.get('clientId');
  const { data: presetClient, isPending } = useClient(presetClientId);
  if (presetClientId && isPending) return null;
  return <LoanForm presetClient={presetClient ?? null} />;
}

function LoanForm({ presetClient }) {
  const navigate = useNavigate();
  const today = getToday();
  const create = useCreateLoan();
  const [generalError, setGeneralError] = useState(null);
  const [client, setClient] = useState(presetClient);
  const [coDebtor, setCoDebtor] = useState(null);
  // Search text when "Crear cliente nuevo" was pressed (null = dialog closed).
  const [newClientSearch, setNewClientSearch] = useState(null);
  const { can } = useAuth();

  const schema = useMemo(() => loanFormSchema({ today }), [today]);
  const {
    register,
    control,
    handleSubmit,
    setValue,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema), defaultValues: { ...emptyLoanForm(today), clientId: presetClient?.id ?? null } });

  const values = useWatch({ control });
  const frequency = values.frequency;
  const rates = useInterestRates({ enabled: frequency === 'monthly' });

  // Preview as soon as the money terms are complete (after a short pause in typing).
  // Compared as text: the watched values are a new object on every render.
  const termsText = termsSchema({ today }).safeParse(values).success ? JSON.stringify(toTermsPayload(values)) : '';
  const debouncedTermsText = useDebouncedValue(termsText, 400);
  const debouncedTerms = useMemo(() => (debouncedTermsText ? JSON.parse(debouncedTermsText) : null), [debouncedTermsText]);
  const preview = useLoanPreview(debouncedTerms);

  const pickParty = (field, setter) => (picked) => {
    setter(picked);
    setValue(field, picked?.id ?? null);
    clearErrors(field);
  };

  const onSubmit = async (formValues) => {
    setGeneralError(null);
    try {
      const loan = await create.mutateAsync(toLoanPayload(formValues));
      navigate(`/loans/${loan.id}`, { replace: true });
    } catch (error) {
      if (!applyServerErrors(error, setError, LOAN_FIELDS)) setGeneralError(error);
    }
  };

  return (
    <>
      <NewClientDialog
        open={newClientSearch !== null}
        search={newClientSearch}
        onClose={() => setNewClientSearch(null)}
        onCreated={pickParty('clientId', setClient)}
      />
      <PageHeader title="Nuevo crédito" backTo={presetClient ? `/clients/${presetClient.id}` : '/loans'} />
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="min-w-0 space-y-5">
          <Card title="Personas">
            <div className="space-y-4">
              <ClientPicker
                label="Cliente (deudor)"
                required
                value={client}
                onChange={pickParty('clientId', setClient)}
                excludeId={coDebtor?.id}
                error={errors.clientId?.message}
                // Only the debtor can be created here; the co-debtor must already be a client.
                onCreateNew={can('clients.create') ? setNewClientSearch : undefined}
              />
              <ClientPicker label="Codeudor" required value={coDebtor} onChange={pickParty('coDebtorId', setCoDebtor)} excludeId={client?.id} error={errors.coDebtorId?.message} />
            </div>
          </Card>

          <Card title="Condiciones">
            <div className="space-y-4">
              <Controller
                control={control}
                name="frequency"
                render={({ field }) => <SegmentedControl label="Frecuencia" options={FREQUENCY_OPTIONS} value={field.value} onChange={field.onChange} />}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Controller
                  control={control}
                  name="principalAmount"
                  render={({ field }) => <MoneyField label="Valor prestado" required error={errors.principalAmount?.message} {...field} />}
                />
                <TextField
                  label="Fecha de desembolso"
                  type="date"
                  max={today}
                  required
                  hint={values.startDate && values.startDate < today ? 'Fecha pasada: las cuotas ya vencidas quedarán como atrasadas.' : null}
                  error={errors.startDate?.message}
                  {...register('startDate')}
                />
              </div>

              {frequency === 'biweekly' ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Controller
                    control={control}
                    name="installmentAmount"
                    render={({ field }) => <MoneyField label="Valor de cada cuota" required error={errors.installmentAmount?.message} {...field} />}
                  />
                  <TextField label="Número de cuotas" required inputMode="numeric" error={errors.numberOfInstallments?.message} {...register('numberOfInstallments')} />
                </div>
              ) : (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <RateSelect rates={rates} error={errors.monthlyInterestRate?.message} {...register('monthlyInterestRate')} />
                    <TextField
                      label="Día de pago"
                      inputMode="numeric"
                      placeholder={values.startDate ? String(Number(values.startDate.slice(8, 10))) : ''}
                      hint="Vacío: el mismo día del desembolso."
                      error={errors.paymentDay?.message}
                      {...register('paymentDay')}
                    />
                  </div>
                  <TextField
                    label="Número de cuotas"
                    inputMode="numeric"
                    hint="Vacío = sin plazo fijo: cada mes paga solo el interés y abona a capital cuando quiera."
                    error={errors.numberOfInstallments?.message}
                    {...register('numberOfInstallments')}
                  />
                </>
              )}
              <TextAreaField label="Notas" rows={2} error={errors.notes?.message} {...register('notes')} />
            </div>
          </Card>
        </div>

        <div className="min-w-0 space-y-5">
          <SchedulePreview terms={debouncedTerms} preview={preview} frequency={frequency} />
          <ErrorAlert error={generalError} />
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="secondary" to={presetClient ? `/clients/${presetClient.id}` : '/loans'}>
              Cancelar
            </Button>
            <Button type="submit" size="lg" loading={isSubmitting}>
              Guardar crédito
            </Button>
          </div>
        </div>
      </form>
    </>
  );
}

/** The rates of the catalog (only active ones can be used for a new loan). */
function RateSelect({ rates, error, ...field }) {
  const options = rates.data ?? [];
  const hint = rates.error
    ? 'No se pudieron cargar las tasas.'
    : rates.data && options.length === 0
      ? 'No hay tasas activas. Pídale al administrador que active al menos una.'
      : null;
  return (
    <SelectField label="Interés mensual" required hint={hint} error={error} disabled={rates.isPending} {...field}>
      <option value="">{rates.isPending ? 'Cargando…' : 'Elija la tasa'}</option>
      {options.map(({ id, rate }) => (
        <option key={id} value={String(rate)}>
          {formatPercent(rate)}
        </option>
      ))}
    </SelectField>
  );
}

function SchedulePreview({ terms, preview, frequency }) {
  const openEnded = frequency === 'monthly' && terms && !terms.numberOfInstallments;
  return (
    <Card title="Proyección de cuotas" actions={preview.isFetching && <Spinner className="size-4 text-slate-400" />} padded={false}>
      {!terms ? (
        <p className="px-4 py-8 text-center text-sm text-slate-500">Complete las condiciones para ver las cuotas.</p>
      ) : preview.error ? (
        <div className="p-4">
          <ErrorAlert error={preview.error} />
        </div>
      ) : !preview.data ? (
        <p className="px-4 py-8 text-center text-sm text-slate-500">Calculando…</p>
      ) : (
        <>
          {openEnded && (
            <div className="p-4 pb-0">
              <Alert tone="info">Sin plazo fijo: se muestra la primera cuota de interés. Cada mes se genera la siguiente con el saldo que quede.</Alert>
            </div>
          )}
          <div className="max-h-[28rem] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2 font-medium">#</th>
                  <th className="px-2 py-2 font-medium">Vence</th>
                  <th className="px-2 py-2 text-right font-medium">Capital</th>
                  <th className="px-2 py-2 text-right font-medium">Interés</th>
                  <th className="px-4 py-2 text-right font-medium">Cuota</th>
                </tr>
              </thead>
              <tbody className="tabular divide-y divide-slate-100">
                {preview.data.installments.map((row) => (
                  <tr key={row.installmentNumber}>
                    <td className="px-4 py-2 text-slate-500">{row.installmentNumber}</td>
                    <td className="whitespace-nowrap px-2 py-2">{formatDate(row.dueDate)}</td>
                    <td className="px-2 py-2 text-right">{formatMoney(row.principalDue)}</td>
                    <td className="px-2 py-2 text-right">{formatMoney(row.interestDue)}</td>
                    <td className="px-4 py-2 text-right font-semibold">{formatMoney(row.amountDue)}</td>
                  </tr>
                ))}
              </tbody>
              {!openEnded && (
                <tfoot className="tabular border-t-2 border-slate-200 bg-slate-50 font-semibold">
                  <tr>
                    <td className="px-4 py-2" colSpan={2}>
                      Total
                    </td>
                    <td className="px-2 py-2 text-right">{formatMoney(preview.data.totals.principal)}</td>
                    <td className="px-2 py-2 text-right">{formatMoney(preview.data.totals.interest)}</td>
                    <td className="px-4 py-2 text-right">{formatMoney(preview.data.totals.amount)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </>
      )}
    </Card>
  );
}
