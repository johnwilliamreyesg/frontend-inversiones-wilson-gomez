import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';

/**
 * List filters stored in the URL (?search=ana&page=2). The back button and
 * a shared link restore the same list. Changing any filter except `page`
 * goes back to page 1.
 *
 * @param {Record<string, string>} defaults
 */
export const useUrlFilters = (defaults = {}) => {
  const [params, setParams] = useSearchParams();

  const filters = useMemo(() => {
    const values = { ...defaults };
    for (const [key, value] of params.entries()) values[key] = value;
    return values;
    // `defaults` is a literal in the caller; its content never changes.
  }, [params]);

  const setFilters = useCallback(
    (changes) => {
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          for (const [key, value] of Object.entries(changes)) {
            if (value === undefined || value === null || value === '' || value === defaults[key]) next.delete(key);
            else next.set(key, String(value));
          }
          if (!('page' in changes)) next.delete('page');
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  return [filters, setFilters];
};
