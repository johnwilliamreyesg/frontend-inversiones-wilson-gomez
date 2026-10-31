import { AlertCircle, CheckCircle2, Info, TriangleAlert, Inbox } from 'lucide-react';
import { Spinner } from './Spinner.jsx';
import { Button } from './Button.jsx';
import { errorMessage } from '../../api/api-error.js';

const ALERT_TONES = {
  info: { classes: 'bg-sky-50 text-sky-900 ring-sky-200', icon: Info },
  success: { classes: 'bg-emerald-50 text-emerald-900 ring-emerald-200', icon: CheckCircle2 },
  warning: { classes: 'bg-amber-50 text-amber-900 ring-amber-200', icon: TriangleAlert },
  danger: { classes: 'bg-red-50 text-red-900 ring-red-200', icon: AlertCircle },
};

export function Alert({ tone = 'info', title, children, className = '' }) {
  const { classes, icon: Icon } = ALERT_TONES[tone];
  return (
    <div role={tone === 'danger' ? 'alert' : 'status'} className={`flex gap-3 rounded-lg p-3 text-sm ring-1 ring-inset ${classes} ${className}`}>
      <Icon className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
      <div className="min-w-0">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={title ? 'mt-0.5' : ''}>{children}</div>}
      </div>
    </div>
  );
}

/** Shows the API error of a failed mutation/form submit, or nothing. */
export function ErrorAlert({ error, className }) {
  if (!error) return null;
  return (
    <Alert tone="danger" className={className}>
      {errorMessage(error)}
    </Alert>
  );
}

const BADGE_TONES = {
  neutral: 'bg-slate-100 text-slate-700 ring-slate-300',
  info: 'bg-sky-50 text-sky-800 ring-sky-200',
  success: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  warning: 'bg-amber-50 text-amber-800 ring-amber-200',
  danger: 'bg-red-50 text-red-800 ring-red-200',
};

export function Badge({ tone = 'neutral', children }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${BADGE_TONES[tone]}`}>
      {children}
    </span>
  );
}

export function LoadingState({ label = 'Cargando…' }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-slate-500" role="status">
      <Spinner />
      <span>{label}</span>
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="py-6">
      <Alert tone="danger" title="No se pudo cargar la información">
        <p>{errorMessage(error)}</p>
        {onRetry && (
          <Button variant="secondary" size="sm" className="mt-3" onClick={onRetry}>
            Reintentar
          </Button>
        )}
      </Alert>
    </div>
  );
}

export function EmptyState({ icon: Icon = Inbox, title, children, action }) {
  return (
    <div className="flex flex-col items-center px-4 py-12 text-center">
      <div className="rounded-full bg-slate-100 p-3 text-slate-400">
        <Icon className="size-7" aria-hidden="true" />
      </div>
      <p className="mt-3 font-semibold text-slate-800">{title}</p>
      {children && <p className="mt-1 max-w-sm text-sm text-slate-500">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
