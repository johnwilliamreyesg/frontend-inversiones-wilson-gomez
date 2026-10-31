import { Link } from 'react-router';
import { ChevronRight } from 'lucide-react';
import { Badge } from '../../components/ui/Feedback.jsx';
import { LOAN_STATUS } from '../../utils/labels.js';
import { formatDate, formatMoney } from '../../utils/format.js';
import { describeTerms } from './loan-terms.js';

export function LoanStatusBadge({ status }) {
  const { label, tone } = LOAN_STATUS[status] ?? { label: status, tone: 'neutral' };
  return <Badge tone={tone}>{label}</Badge>;
}

/**
 * Rows of loans used by the loan list and the client detail.
 * `show` picks the person shown on each row: 'client' or 'coDebtor'.
 */
export function LoanRows({ loans, show = 'client' }) {
  return (
    <ul className="divide-y divide-slate-100">
      {loans.map((loan) => (
        <li key={loan.id}>
          <Link to={`/loans/${loan.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50">
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-2">
                <span className="truncate font-medium text-slate-900">
                  #{loan.id} · {show === 'coDebtor' ? `Deudor: ${loan.clientName}` : loan.clientName}
                </span>
                <LoanStatusBadge status={loan.status} />
              </span>
              <span className="block truncate text-sm text-slate-500">
                {formatMoney(loan.principalAmount)} · {describeTerms(loan)}
              </span>
              <span className="block text-xs text-slate-500">
                Desembolso {formatDate(loan.startDate)} · Saldo capital <span className="tabular font-medium text-slate-700">{formatMoney(loan.principalBalance)}</span>
              </span>
            </span>
            <ChevronRight className="size-5 shrink-0 text-slate-400" aria-hidden="true" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
