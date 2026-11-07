import { Link } from 'react-router';
import { History } from 'lucide-react';
import { Card } from '../../components/ui/Card.jsx';
import { EmptyState } from '../../components/ui/Feedback.jsx';
import { formatDate, formatMoney, formatPercent } from '../../utils/format.js';

/** Rate column: monthly loans have a rate; biweekly ones an agreed installment. */
const rateOf = (loan) =>
  loan.frequency === 'monthly'
    ? `${formatPercent(loan.monthlyInterestRate)} mensual`
    : `Quincenal · ${loan.numberOfInstallments} × ${formatMoney(loan.installmentAmount)}`;

/**
 * "Créditos pagados (historial)": number, disbursement, payoff date, rate and
 * amount of every loan the client finished paying. Cards on phones, a table
 * on wider screens.
 */
export function PaidLoansHistory({ loans, title = 'Créditos pagados (historial)' }) {
  return (
    <Card title={`${title} (${loans.length})`} padded={false} collapsible>
      {loans.length === 0 ? (
        <EmptyState icon={History} title="Todavía no ha terminado de pagar ningún crédito" />
      ) : (
        <>
          <ul className="divide-y divide-slate-100 sm:hidden">
            {loans.map((loan) => (
              <li key={loan.id}>
                <Link to={`/loans/${loan.id}`} className="block px-4 py-3 hover:bg-slate-50">
                  <span className="flex items-center justify-between gap-3">
                    <span className="font-semibold text-brand-700">Crédito #{loan.id}</span>
                    <span className="tabular font-semibold text-slate-900">{formatMoney(loan.principalAmount)}</span>
                  </span>
                  <span className="block text-sm text-slate-600">{rateOf(loan)}</span>
                  <span className="block text-xs text-slate-500">
                    {formatDate(loan.startDate)} → {loan.paidOffDate ? formatDate(loan.paidOffDate) : '—'}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Crédito</th>
                  <th className="px-2 py-2 font-medium">Desembolso</th>
                  <th className="px-2 py-2 font-medium">Pagado el</th>
                  <th className="px-2 py-2 font-medium">Tasa</th>
                  <th className="px-4 py-2 text-right font-medium">Monto</th>
                </tr>
              </thead>
              <tbody className="tabular divide-y divide-slate-100">
                {loans.map((loan) => (
                  <tr key={loan.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2">
                      <Link to={`/loans/${loan.id}`} className="font-medium text-brand-700 hover:underline">
                        #{loan.id}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-2 py-2">{formatDate(loan.startDate)}</td>
                    <td className="whitespace-nowrap px-2 py-2">{loan.paidOffDate ? formatDate(loan.paidOffDate) : '—'}</td>
                    <td className="px-2 py-2">{rateOf(loan)}</td>
                    <td className="px-4 py-2 text-right font-medium">{formatMoney(loan.principalAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Card>
  );
}
