import { useState } from 'react';
import { UserRound, X } from 'lucide-react';
import { useClients } from './clients.queries.js';
import { SearchInput } from '../../components/ui/ListControls.jsx';
import { Spinner } from '../../components/ui/Spinner.jsx';
import { formatPhone } from '../../utils/format.js';

const MIN_SEARCH_LENGTH = 2;

/**
 * Pick a registered client by typing part of the name or ID.
 * `value` is the chosen client object (or null).
 */
export function ClientPicker({ label, value, onChange, error, excludeId, required }) {
  const [search, setSearch] = useState('');
  const enabled = search.trim().length >= MIN_SEARCH_LENGTH;
  const { data, isFetching } = useClients({ search, pageSize: 6 }, { enabled });
  const results = (data?.data ?? []).filter((client) => client.id !== excludeId);

  return (
    <div>
      <p className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-red-600"> *</span>}
      </p>
      {value ? (
        <div className="flex items-center gap-3 rounded-lg bg-brand-50 px-3 py-2.5 ring-1 ring-inset ring-brand-200">
          <UserRound className="size-5 shrink-0 text-brand-700" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-slate-900">{value.fullName}</p>
            <p className="truncate text-sm text-slate-600">
              CC {value.nationalId} · {formatPhone(value.phoneCountryCode, value.phoneNumber)}
            </p>
          </div>
          <button type="button" onClick={() => onChange(null)} className="rounded-lg p-1.5 text-slate-500 hover:bg-white" aria-label={`Quitar ${label.toLowerCase()}`}>
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <div>
          <SearchInput value={search} onChange={setSearch} placeholder="Escriba nombre o cédula" />
          {enabled && (
            <div className="mt-1 overflow-hidden rounded-lg bg-white ring-1 ring-slate-200">
              {isFetching && !data ? (
                <div className="flex items-center gap-2 px-3 py-3 text-sm text-slate-500">
                  <Spinner className="size-4" /> Buscando…
                </div>
              ) : results.length === 0 ? (
                <p className="px-3 py-3 text-sm text-slate-500">Ningún cliente coincide. Regístrelo primero en Clientes.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {results.map((client) => (
                    <li key={client.id}>
                      <button
                        type="button"
                        onClick={() => {
                          onChange(client);
                          setSearch('');
                        }}
                        className="block w-full px-3 py-2.5 text-left hover:bg-slate-50"
                      >
                        <span className="block font-medium text-slate-900">{client.fullName}</span>
                        <span className="block text-sm text-slate-500">CC {client.nationalId}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
      {error && <p className="mt-1.5 text-sm text-red-600">{error}</p>}
    </div>
  );
}
