import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import { useDebouncedValue } from '../../hooks/useDebouncedValue.js';

/**
 * Search box that reports the text only after the user stops typing
 * (one request per pause, not one per key).
 */
export function SearchInput({ value, onChange, placeholder = 'Buscar…', className = '' }) {
  const [text, setText] = useState(value ?? '');
  const debounced = useDebouncedValue(text, 350);

  useEffect(() => {
    if (debounced !== (value ?? '')) onChange(debounced);
    // Only react to the debounced text; `value` changing from outside resets below.
  }, [debounced]);

  useEffect(() => {
    setText(value ?? '');
  }, [value]);

  return (
    <div className={`relative ${className}`}>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
      <input
        type="search"
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="block h-11 w-full rounded-lg border-0 bg-white pl-9 pr-9 text-base ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-600 sm:text-sm [&::-webkit-search-cancel-button]:hidden"
      />
      {text && (
        <button
          type="button"
          onClick={() => {
            setText('');
            onChange('');
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700"
          aria-label="Limpiar búsqueda"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}

export function Pagination({ meta, onPageChange }) {
  if (!meta || meta.totalPages <= 1) return null;
  const { page, totalPages, total } = meta;
  return (
    <nav className="flex items-center justify-between gap-3 px-1 py-3 text-sm text-slate-600" aria-label="Paginación">
      <span>
        Página {page} de {totalPages} · {total} registros
      </span>
      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="rounded-lg p-2 ring-1 ring-inset ring-slate-300 hover:bg-white disabled:opacity-40"
          aria-label="Página anterior"
        >
          <ChevronLeft className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="rounded-lg p-2 ring-1 ring-inset ring-slate-300 hover:bg-white disabled:opacity-40"
          aria-label="Página siguiente"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    </nav>
  );
}

/** Pill buttons to pick one value ("Todos / Activos / Pagados"). */
export function SegmentedControl({ options, value, onChange, label }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-1 overflow-x-auto rounded-lg bg-slate-200/70 p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            value === option.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
