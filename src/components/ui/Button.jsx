import { Link } from 'react-router';
import { Spinner } from './Spinner.jsx';

const VARIANTS = {
  primary: 'bg-brand-700 text-white hover:bg-brand-800 disabled:bg-brand-700/60',
  secondary: 'bg-white text-slate-800 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 disabled:text-slate-400',
  danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-600/60',
  ghost: 'text-slate-700 hover:bg-slate-200/70 disabled:text-slate-400',
};
const SIZES = {
  sm: 'h-9 px-3 text-sm gap-1.5',
  md: 'h-11 px-4 text-sm gap-2',
  lg: 'h-12 px-5 text-base gap-2',
};

export const buttonClasses = ({ variant = 'primary', size = 'md', block = false, className = '' } = {}) =>
  [
    'inline-flex items-center justify-center rounded-lg font-semibold transition-colors select-none',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:cursor-not-allowed',
    VARIANTS[variant],
    SIZES[size],
    block ? 'w-full' : '',
    className,
  ].join(' ');

/** Button; with `to` it renders a router link that looks the same. */
export function Button({ variant, size, block, loading = false, icon: Icon, to, className, children, disabled, type = 'button', ...props }) {
  const classes = buttonClasses({ variant, size, block, className });
  const content = (
    <>
      {loading ? <Spinner className="size-4" /> : Icon && <Icon className="size-4 shrink-0" aria-hidden="true" />}
      {children}
    </>
  );
  if (to) {
    return (
      <Link to={to} className={classes} {...props}>
        {content}
      </Link>
    );
  }
  return (
    <button type={type} className={classes} disabled={disabled || loading} {...props}>
      {content}
    </button>
  );
}
