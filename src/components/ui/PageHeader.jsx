import { Link } from 'react-router';
import { ArrowLeft } from 'lucide-react';

export function PageHeader({ title, subtitle, backTo, actions }) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-2">
        {backTo && (
          <Link to={backTo} className="-ml-2 mt-0.5 rounded-lg p-1.5 text-slate-500 hover:bg-slate-200 hover:text-slate-800" aria-label="Volver">
            <ArrowLeft className="size-5" />
          </Link>
        )}
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">{title}</h1>
          {subtitle && <div className="mt-0.5 text-sm text-slate-500">{subtitle}</div>}
        </div>
      </div>
      {/* Phones: the actions get their own row and share its width. */}
      {actions && <div className="flex w-full flex-wrap gap-2 sm:w-auto [&>*]:grow sm:[&>*]:grow-0">{actions}</div>}
    </div>
  );
}
