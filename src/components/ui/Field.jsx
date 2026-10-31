import { useId } from 'react';

const CONTROL =
  'block w-full rounded-lg border-0 bg-white px-3 text-base text-slate-900 ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 ' +
  'focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-600 disabled:bg-slate-100 disabled:text-slate-500 sm:text-sm';
const INVALID = 'ring-red-500 focus:ring-red-600';

export const controlClasses = (invalid, extra = '') => `${CONTROL} ${invalid ? INVALID : ''} ${extra}`;

/**
 * Label + control + hint/error. `children` is a function that receives the
 * id and aria props, so every input type gets the same accessible wiring.
 */
export function Field({ label, error, hint, required, className = '', children }) {
  const id = useId();
  const messageId = `${id}-message`;
  const message = error || hint;
  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700">
          {label}
          {required && <span className="text-red-600"> *</span>}
        </label>
      )}
      {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': message ? messageId : undefined })}
      {message && (
        <p id={messageId} className={`mt-1.5 text-sm ${error ? 'text-red-600' : 'text-slate-500'}`}>
          {message}
        </p>
      )}
    </div>
  );
}

export function TextField({ label, error, hint, required, className, inputClassName = '', ...props }) {
  return (
    <Field label={label} error={error} hint={hint} required={required} className={className}>
      {(aria) => <input className={controlClasses(error, `h-11 ${inputClassName}`)} {...aria} {...props} />}
    </Field>
  );
}

export function SelectField({ label, error, hint, required, className, children, ...props }) {
  return (
    <Field label={label} error={error} hint={hint} required={required} className={className}>
      {(aria) => (
        <select className={controlClasses(error, 'h-11 pr-8')} {...aria} {...props}>
          {children}
        </select>
      )}
    </Field>
  );
}

export function TextAreaField({ label, error, hint, required, className, rows = 3, ...props }) {
  return (
    <Field label={label} error={error} hint={hint} required={required} className={className}>
      {(aria) => <textarea rows={rows} className={controlClasses(error, 'py-2.5')} {...aria} {...props} />}
    </Field>
  );
}

export function CheckboxField({ label, hint, className = '', ...props }) {
  const id = useId();
  return (
    <div className={`flex items-start gap-3 ${className}`}>
      <input id={id} type="checkbox" className="mt-0.5 size-5 rounded border-slate-300 accent-brand-700" {...props} />
      <label htmlFor={id} className="text-sm">
        <span className="font-medium text-slate-800">{label}</span>
        {hint && <span className="block text-slate-500">{hint}</span>}
      </label>
    </div>
  );
}
