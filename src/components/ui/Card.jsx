export function Card({ title, actions, children, className = '', padded = true }) {
  return (
    <section className={`rounded-xl bg-white shadow-sm ring-1 ring-slate-200 ${className}`}>
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
          {title && <h2 className="font-semibold text-slate-900">{title}</h2>}
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </header>
      )}
      <div className={padded ? 'p-4' : ''}>{children}</div>
    </section>
  );
}

/** Label/value pairs ("Cédula: 123"). Falsy items are skipped. */
/** Label/value pairs. `columns={1}` for narrow places such as a side column. */
export function DescriptionList({ items, columns = 2, className = '' }) {
  return (
    <dl className={`grid grid-cols-1 gap-x-6 gap-y-3 ${columns === 2 ? 'sm:grid-cols-2' : ''} ${className}`}>
      {items.filter(Boolean).map(({ label, value }) => (
        <div key={label} className="min-w-0">
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
          <dd className="mt-0.5 break-words text-slate-900">{value ?? '—'}</dd>
        </div>
      ))}
    </dl>
  );
}

const STAT_TONES = { default: 'text-slate-900', success: 'text-emerald-700', danger: 'text-red-700', brand: 'text-brand-700' };

export function StatCard({ label, value, hint, tone = 'default', className = '' }) {
  return (
    <div className={`rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 ${className}`}>
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`tabular mt-1 text-xl font-bold sm:text-2xl ${STAT_TONES[tone]}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
