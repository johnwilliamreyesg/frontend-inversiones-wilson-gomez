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
  // "Crear cliente nuevo" from one of the pickers: which one and what was typed (null = closed).
  const [newClient, setNewClient] = useState(null);
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
  const rates = useInterestRates();

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
        open={newClient !== null}
        search={newClient?.search}
        onClose={() => setNewClient(null)}
        onCreated={newClient?.field === 'coDebtorId' ? pickParty('coDebtorId', setCoDebtor) : pickParty('clientId', setClient)}
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
                onCreateNew={can('clients.create') ? (search) => setNewClient({ field: 'clientId', search }) : undefined}
              />
              <ClientPicker
                label="Codeudor (opcional)"
                value={coDebtor}
                onChange={pickParty('coDebtorId', setCoDebtor)}
                excludeId={client?.id}
                error={errors.coDebtorId?.message}
                onCreateNew={can('clients.create') ? (search) => setNewClient({ field: 'coDebtorId', search }) : undefined}
              />
            </div>
          </Card>

          <Card title="Condiciones">
            <div className="space-y-4">
              <Controller
                control={control}
                name="frequency"
                render={({ field }) => <SegmentedControl label="Frecuencia" options={FREQUENCY_OPTIONS} value={field.value} onChange={field.onChange} />}
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

              <RateSelect
                rates={rates}
                hint={frequency === 'biweekly' ? 'Tasa mensual: cada quincena se cobra la mitad.' : null}
                error={errors.monthlyInterestRate?.message}
                {...register('monthlyInterestRate')}
              />
              {frequency === 'biweekly' ? (
                <>
                  <TextField label="Número de cuotas (quincenas)" required inputMode="numeric" error={errors.numberOfInstallments?.message} {...register('numberOfInstallments')} />
                  <div className="grid grid-cols-2 gap-4">
                    <TextField label="Primer día de cobro" inputMode="numeric" placeholder="15" error={errors.paymentDay?.message} {...register('paymentDay')} />
                    <TextField label="Segundo día de cobro" inputMode="numeric" placeholder="30" error={errors.secondPaymentDay?.message} {...register('secondPaymentDay')} />
                  </div>
                  <p className="-mt-2 text-sm text-slate-500">Vacíos: el 15 y el 30 de cada mes (en febrero, el último día).</p>
                </>
              ) : (
                <>
                  <TextField
                    label="Día de pago"
                    inputMode="numeric"
                    placeholder={values.startDate ? String(Number(values.startDate.slice(8, 10))) : ''}
                    hint="Vacío: el mismo día del desembolso."
                    error={errors.paymentDay?.message}
                    {...register('paymentDay')}
                  />
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
function RateSelect({ rates, error, hint: extraHint, ...field }) {
  const options = rates.data ?? [];
  const hint = rates.error
    ? 'No se pudieron cargar las tasas.'
    : rates.data && options.length === 0
      ? 'No hay tasas activas. Pídale al administrador que active al menos una.'
      : extraHint;
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
    <Card title="Proyección de cuotas" collapsible actions={preview.isFetching && <Spinner className="size-4 text-slate-400" />} padded={false}>
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
                  <th className="hidden px-4 py-2 font-medium sm:table-cell">#</th>
                  <th className="py-2 pl-4 pr-2 font-medium sm:pl-2">Vence</th>
                  <th className="hidden px-2 py-2 text-right font-medium sm:table-cell">Capital</th>
                  <th className="hidden px-2 py-2 text-right font-medium sm:table-cell">Interés</th>
                  <th className="px-4 py-2 text-right font-medium">Cuota</th>
                </tr>
              </thead>
              <tbody className="tabular divide-y divide-slate-100">
                {preview.data.installments.map((row) => (
                  <tr key={row.installmentNumber}>
                    <td className="hidden px-4 py-2 text-slate-500 sm:table-cell">{row.installmentNumber}</td>
                    <td className="py-2 pl-4 pr-2 sm:pl-2">
                      <span className="whitespace-nowrap">
                        <span className="text-slate-500 sm:hidden">#{row.installmentNumber} · </span>
                        {formatDate(row.dueDate)}
                      </span>
                      {/* Phones: capital and interest under the date instead of in their own columns. */}
                      <span className="block text-[11px] text-slate-500 sm:hidden">
                        Capital {formatMoney(row.principalDue)} · Interés {formatMoney(row.interestDue)}
                      </span>
                    </td>
                    <td className="hidden px-2 py-2 text-right sm:table-cell">{formatMoney(row.principalDue)}</td>
                    <td className="hidden px-2 py-2 text-right sm:table-cell">{formatMoney(row.interestDue)}</td>
                    <td className="px-4 py-2 text-right font-semibold">{formatMoney(row.amountDue)}</td>
                  </tr>
                ))}
              </tbody>
              {!openEnded && (
                <tfoot className="tabular border-t-2 border-slate-200 bg-slate-50 font-semibold">
                  <tr>
                    {/* Separate "#" cell: a colSpan would count a column that phones hide. */}
                    <td className="hidden px-4 py-2 sm:table-cell" />
                    <td className="py-2 pl-4 pr-2 sm:pl-2">
                      Total
                      <span className="block text-[11px] font-normal text-slate-500 sm:hidden">
                        Capital {formatMoney(preview.data.totals.principal)} · Interés {formatMoney(preview.data.totals.interest)}
                      </span>
                    </td>
                    <td className="hidden px-2 py-2 text-right sm:table-cell">{formatMoney(preview.data.totals.principal)}</td>
                    <td className="hidden px-2 py-2 text-right sm:table-cell">{formatMoney(preview.data.totals.interest)}</td>
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
