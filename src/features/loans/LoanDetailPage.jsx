import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { Ban, CalendarClock, HandCoins, Handshake, Undo2 } from 'lucide-react';
import { RenegotiateDialog } from '../write-offs/WriteOffDialogs.jsx';
import { useCancelLoan, useLoan, useLoanPayments } from './loans.queries.js';
import { useClientLoans } from '../clients/clients.queries.js';
import { PaidLoansHistory } from './PaidLoansHistory.jsx';
import { LoanStatusBadge } from './LoanRows.jsx';
import { describeTerms, isOpenEnded, paidLoans } from './loan-terms.js';
import { PaymentDialog } from '../payments/PaymentDialog.jsx';
import { VoidPaymentDialog } from '../payments/VoidPaymentDialog.jsx';
import { RescheduleDialog } from './RescheduleDialog.jsx';
import { WhatsAppButton } from '../../components/ui/WhatsAppButton.jsx';
import { loanReminder } from '../../utils/whatsapp.js';
import { useAuth } from '../../auth/AuthProvider.jsx';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { Card, DescriptionList, StatCard } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { ConfirmDialog } from '../../components/ui/Modal.jsx';
import { Alert, Badge, EmptyState, ErrorState, LoadingState } from '../../components/ui/Feedback.jsx';
import { INSTALLMENT_STATUS, FREQUENCY, PAYMENT_METHOD, PAYMENT_TYPE, RECALCULATION } from '../../utils/labels.js';
import { formatDate, formatDateTime, formatDays, formatMoney } from '../../utils/format.js';
import { today as getToday } from '../../utils/dates.js';

const OPEN_LOAN = new Set(['active', 'defaulted']);

export function LoanDetailPage() {
  const { id } = useParams();
  const { can } = useAuth();
  const { data: loan, error, isPending, refetch } = useLoan(id);
  const [paying, setPaying] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [rescheduling, setRescheduling] = useState(null);
  const [negotiating, setNegotiating] = useState(false);
  const cancel = useCancelLoan();

  if (isPending) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  const { summary } = loan;
  const isOpen = OPEN_LOAN.has(loan.status);
  const openEnded = isOpenEnded(loan);
  const today = getToday();
  // summary.nextDueDate is the oldest unpaid one (often overdue); here: the next one not yet late.
  const upcoming = loan.installments.find((row) => ['pending', 'partially_paid'].includes(row.status) && row.dueDate >= today);
  const reminder = isOpen ? loanReminder(loan, today) : null;

  return (
    <>
      <PageHeader
        title={`Crédito #${loan.id}`}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <Link to={`/clients/${loan.clientId}`} className="font-medium text-brand-700 hover:underline">
              {loan.clientName}
            </Link>
            <LoanStatusBadge status={loan.status} />
          </span>
        }
        backTo="/loans"
        actions={
          <>
            {isOpen && can('payments.create') && (
              <Button icon={HandCoins} onClick={() => setPaying(true)}>
                Registrar pago
              </Button>
            )}
            {reminder && (
              <WhatsAppButton countryCode={loan.clientPhoneCountryCode} phoneNumber={loan.clientPhoneNumber} message={reminder}>
                <span className="sm:hidden">Recordar</span>
                <span className="hidden sm:inline">Recordar por WhatsApp</span>
              </WhatsAppButton>
            )}
            {loan.status === 'written_off' && can('portfolio.write_off') && (
              <Button icon={Handshake} onClick={() => setNegotiating(true)}>
                Acuerdo de pago
              </Button>
            )}
            {loan.status === 'active' && can('loans.update') && (
              <Button variant="secondary" icon={Ban} onClick={() => setCancelling(true)}>
                Cancelar crédito
              </Button>
            )}
          </>
        }
      />

      {loan.status === 'written_off' && (
        <Alert tone="danger" title="Crédito en cartera castigada" className="mb-5">
          Castigado el {formatDateTime(loan.writtenOffAt)}. No recibe pagos ni cuenta en los cálculos del mes hasta que se haga un acuerdo de pago.
        </Alert>
      )}

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Saldo de capital" value={formatMoney(loan.principalBalance)} hint={`de ${formatMoney(loan.principalAmount)} prestados`} tone="brand" />
        <StatCard
          label="En mora"
          value={formatMoney(summary.overdueAmount)}
          hint={summary.overdueInstallments ? `${summary.overdueInstallments} cuota(s) atrasada(s)` : 'Al día'}
          tone={summary.overdueAmount > 0 ? 'danger' : 'success'}
        />
        <StatCard label={openEnded ? 'Pendiente (interés generado)' : 'Pendiente total'} value={formatMoney(summary.totalRemaining)} hint={`Pagado ${formatMoney(summary.totalPaid)}`} />
        <StatCard
          label="Próxima cuota"
          value={upcoming ? formatDate(upcoming.dueDate) : '—'}
          hint={upcoming ? `Por ${formatMoney(upcoming.amountRemaining)}` : null}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-5">
          <InstallmentsCard loan={loan} openEnded={openEnded} onReschedule={isOpen && can('loans.update') ? setRescheduling : null} />
          {can('payments.read') && <PaymentsCard loanId={loan.id} canVoid={can('payments.void')} />}
          {loan.dueDateChanges?.length > 0 && <DueDateHistoryCard changes={loan.dueDateChanges} />}
          {loan.renegotiations?.length > 0 && <RenegotiationsCard renegotiations={loan.renegotiations} />}
        </div>
        <Card title="Condiciones" collapsible className="self-start">
          <DescriptionList
            columns={1}
            items={[
              { label: 'Frecuencia', value: FREQUENCY[loan.frequency] },
              { label: 'Condiciones', value: describeTerms(loan) },
              { label: 'Valor prestado', value: formatMoney(loan.principalAmount) },
              { label: 'Desembolso', value: formatDate(loan.startDate) },
              loan.frequency === 'monthly' && { label: 'Día de pago', value: `${loan.paymentDay} de cada mes` },
              loan.frequency === 'biweekly' && loan.secondPaymentDay && { label: 'Días de cobro', value: `${loan.paymentDay} y ${loan.secondPaymentDay} de cada mes` },
              {
                label: 'Codeudor',
                value: loan.coDebtorId ? (
                  <Link className="text-brand-700 hover:underline" to={`/clients/${loan.coDebtorId}`}>
                    {loan.coDebtorName}
                  </Link>
                ) : (
                  'Sin codeudor'
                ),
              },
              loan.notes && { label: 'Notas', value: <span className="whitespace-pre-line">{loan.notes}</span> },
              { label: 'Registrado', value: formatDateTime(loan.createdAt) },
            ]}
          />
        </Card>
      </div>

      <div className="mt-5">
        <ClientPaidLoans clientId={loan.clientId} clientName={loan.clientName} excludeId={loan.id} />
      </div>

      <RescheduleDialog loan={loan} installment={rescheduling} onClose={() => setRescheduling(null)} />
      <RenegotiateDialog loan={negotiating ? loan : null} onClose={() => setNegotiating(false)} />
      <PaymentDialog
        open={paying}
        onClose={() => setPaying(false)}
        loanId={loan.id}
        clientName={loan.clientName}
      />
      <ConfirmDialog
        open={cancelling}
        onClose={() => {
          setCancelling(false);
          cancel.reset();
        }}
        onConfirm={() => cancel.mutate(loan.id, { onSuccess: () => setCancelling(false) })}
        title="Cancelar crédito"
        confirmLabel="Cancelar crédito"
        loading={cancel.isPending}
        error={cancel.error}
      >
        <p>Use esta opción solo para un crédito registrado por error. Sus cuotas quedarán canceladas y no se podrá deshacer.</p>
        <p>Si tiene pagos, primero hay que anularlos.</p>
      </ConfirmDialog>
    </>
  );
}

function InstallmentStatus({ installment }) {
  if (installment.isOverdue) return <Badge tone="danger">Atraso {formatDays(installment.daysOverdue)}</Badge>;
  const { label, tone } = INSTALLMENT_STATUS[installment.status] ?? { label: installment.status, tone: 'neutral' };
  return <Badge tone={tone}>{label}</Badge>;
}

function InstallmentsCard({ loan, openEnded, onReschedule }) {
  // Installments whose current date was set by hand.
  const rescheduled = new Set((loan.dueDateChanges ?? []).map((change) => `${change.installmentId}:${change.newDueDate}`));
  return (
    <Card title={`Cuotas (${loan.installments.length})`} padded={false} collapsible>
      {openEnded && <p className="border-b border-slate-100 px-4 py-2 text-sm text-slate-500">Sin plazo fijo: cada mes se genera la cuota de interés sobre el saldo.</p>}
      <div className="overflow-x-auto">
        {/* Phones: the status goes under the date and only "Falta" (what to collect) is shown, so it fits without scrolling sideways. */}
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="hidden px-4 py-2 font-medium sm:table-cell">#</th>
              <th className="py-2 pl-4 pr-2 font-medium sm:pl-2">Vence</th>
              <th className="hidden px-2 py-2 text-right font-medium sm:table-cell">Cuota</th>
              <th className="hidden px-2 py-2 text-right font-medium sm:table-cell">Pagado</th>
              <th className="px-2 py-2 text-right font-medium">Falta</th>
              <th className="hidden py-2 pl-2 font-medium sm:table-cell">Estado</th>
              {onReschedule && <th className="w-10 py-2 pr-2"><span className="sr-only">Cambiar fecha</span></th>}
            </tr>
          </thead>
          <tbody className="tabular divide-y divide-slate-100">
            {loan.installments.map((row) => (
              <tr key={row.id} className={row.status === 'cancelled' ? 'text-slate-400 line-through' : row.isOverdue ? 'bg-red-50/50' : ''}>
                <td className="hidden px-4 py-2 text-slate-500 sm:table-cell">{row.installmentNumber}</td>
                <td className="py-2 pl-4 pr-2 sm:pl-2">
                  <span className="whitespace-nowrap">
                    <span className="text-slate-500 sm:hidden">#{row.installmentNumber} · </span>
                    {formatDate(row.dueDate)}
                  </span>
                  {rescheduled.has(`${row.id}:${row.dueDate}`) && row.status !== 'paid' && (
                    <span className="block text-[11px] font-medium text-amber-700">Reagendada</span>
                  )}
                  <span className="mt-1 block sm:hidden">
                    <InstallmentStatus installment={row} />
                  </span>
                </td>
                <td className="hidden px-2 py-2 text-right sm:table-cell" title={`Capital ${formatMoney(row.principalDue)} · Interés ${formatMoney(row.interestDue)}`}>
                  {formatMoney(row.amountDue)}
                </td>
                <td className="hidden px-2 py-2 text-right sm:table-cell">{formatMoney(row.amountPaid)}</td>
                <td className="px-2 py-2 text-right font-medium">
                  {formatMoney(row.amountRemaining)}
                  {row.amountRemaining !== row.amountDue && row.status !== 'cancelled' && (
                    <span className="block text-[11px] font-normal text-slate-500 sm:hidden">de {formatMoney(row.amountDue)}</span>
                  )}
                </td>
                <td className="hidden py-2 pl-2 sm:table-cell">
                  <InstallmentStatus installment={row} />
                </td>
                {onReschedule && (
                  <td className="py-2 pr-2 text-right">
                    {['pending', 'partially_paid'].includes(row.status) && (
                      <button
                        type="button"
                        onClick={() => onReschedule(row)}
                        className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                        aria-label={`Cambiar fecha de la cuota ${row.installmentNumber}`}
                        title="Cambiar fecha"
                      >
                        <CalendarClock className="size-4" />
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

/** The client's loans already paid off (other than this one): how they have paid before. */
function ClientPaidLoans({ clientId, clientName, excludeId }) {
  const { data } = useClientLoans(clientId);
  if (!data) return null;
  const firstName = clientName.split(' ')[0];
  return <PaidLoansHistory loans={paidLoans(data.asDebtor, { excludeId })} title={`Créditos pagados de ${firstName}`} />;
}

/** Payment agreements made after the loan was written off: what was owed, agreed and forgiven. */
function RenegotiationsCard({ renegotiations }) {
  return (
    <Card title={`Acuerdos de pago (${renegotiations.length})`} padded={false} collapsible>
      <ul className="divide-y divide-slate-100">
        {renegotiations.map((item) => (
          <li key={item.id} className="px-4 py-3 text-sm">
            <p className="tabular font-medium text-slate-900">
              Debía {formatMoney(item.previousBalance)} → acordado {formatMoney(item.agreedAmount)} en {item.numberOfInstallments} cuota(s) {FREQUENCY[item.frequency].toLowerCase()}(es)
            </p>
            {item.forgivenPrincipal > 0 && <p className="tabular text-red-700">Capital perdonado: {formatMoney(item.forgivenPrincipal)}</p>}
            <p className="text-slate-500">
              {formatDateTime(item.createdAt)} · {item.createdByName ?? '—'} · primera cuota {formatDate(item.firstDueDate)}
              {item.notes && ` · ${item.notes}`}
            </p>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/** Every due date moved by hand: when, from which date to which, by whom and why. */
function DueDateHistoryCard({ changes }) {
  return (
    <Card title={`Cambios de fecha (${changes.length})`} padded={false} collapsible>
      <ul className="divide-y divide-slate-100">
        {changes.map((change) => (
          <li key={change.id} className="px-4 py-3 text-sm">
            <p className="font-medium text-slate-900">
              Cuota #{change.installmentNumber}: {formatDate(change.previousDueDate)} → {formatDate(change.newDueDate)}
            </p>
            <p className="text-slate-500">
              {formatDateTime(change.createdAt)} · {change.changedByName ?? '—'}
              {change.reason && ` · ${change.reason}`}
            </p>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function PaymentsCard({ loanId, canVoid }) {
  const { data: payments, error, isPending, refetch } = useLoanPayments(loanId);
  const [voiding, setVoiding] = useState(null);

  return (
    <Card title={payments ? `Pagos (${payments.length})` : 'Pagos'} padded={false} collapsible>
      {isPending ? (
        <LoadingState />
      ) : error ? (
        <div className="p-4">
          <ErrorState error={error} onRetry={refetch} />
        </div>
      ) : payments.length === 0 ? (
        <EmptyState icon={HandCoins} title="Todavía no hay pagos" />
      ) : (
        <ul className="divide-y divide-slate-100">
          {payments.map((payment) => (
            <li key={payment.id} className={`flex items-start gap-3 px-4 py-3 ${payment.voidedAt ? 'bg-slate-50' : ''}`}>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2">
                  <span className={`tabular font-semibold ${payment.voidedAt ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{formatMoney(payment.amount)}</span>
                  <span className="text-sm text-slate-500">{formatDate(payment.paymentDate)}</span>
                  <Badge>{PAYMENT_METHOD[payment.paymentMethod]}</Badge>
                  {payment.paymentType !== 'installment' && <Badge tone="info">{PAYMENT_TYPE[payment.paymentType]}</Badge>}
                  {payment.recalculation && <Badge>{RECALCULATION[payment.recalculation]}</Badge>}
                  {payment.voidedAt && <Badge tone="danger">Anulado</Badge>}
                </p>
                <p className="text-sm text-slate-500">
                  Interés {formatMoney(payment.interestAmount)} · Capital {formatMoney(payment.principalAmount)} · Recibió {payment.receivedByName ?? '—'}
                </p>
                {payment.notes && <p className="text-sm text-slate-600">{payment.notes}</p>}
                {payment.voidedAt && (
                  <p className="text-sm text-red-700">
                    Anulado por {payment.voidedByName ?? '—'} ({formatDateTime(payment.voidedAt)}): {payment.voidReason}
                  </p>
                )}
              </div>
              {canVoid && !payment.voidedAt && (
                <Button variant="ghost" size="sm" icon={Undo2} onClick={() => setVoiding(payment)}>
                  Anular
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      <VoidPaymentDialog payment={voiding} onClose={() => setVoiding(null)} />
    </Card>
  );
}
