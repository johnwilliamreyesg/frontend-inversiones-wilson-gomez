import { Field, controlClasses } from './Field.jsx';
import { formatNumber, parseMoneyInput } from '../../utils/format.js';

/**
 * Peso input that shows thousands separators while typing ("1.250.000")
 * but hands a plain number (1250000) or null to the form.
 * Controlled: use it with react-hook-form's <Controller>.
 */
export function MoneyField({ label, error, hint, required, className, value, onChange, onBlur, name, placeholder = '0', autoFocus, disabled }) {
  return (
    <Field label={label} error={error} hint={hint} required={required} className={className}>
      {(aria) => (
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-500">$</span>
          <input
            {...aria}
            name={name}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            autoFocus={autoFocus}
            disabled={disabled}
            placeholder={placeholder}
            className={controlClasses(error, 'tabular h-11 pl-7')}
            value={formatNumber(value)}
            onChange={(event) => onChange(parseMoneyInput(event.target.value))}
            onBlur={onBlur}
          />
        </div>
      )}
    </Field>
  );
}
