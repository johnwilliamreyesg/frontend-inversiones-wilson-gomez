import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Button } from './Button.jsx';
import { ErrorAlert } from './Feedback.jsx';

/**
 * Dialog built on the native <dialog> element: focus trap, Esc to close
 * and the backdrop come from the browser. On phones it opens as a bottom sheet.
 * Rendered in <body> (portal) so a dialog with its own form never ends up
 * inside the page's form in the HTML.
 */
export function Modal({ open, onClose, title, children, footer, size = 'md' }) {
  const ref = useRef(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const width = { sm: 'sm:max-w-sm', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl' }[size];

  return createPortal(
    <dialog
      ref={ref}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => event.target === ref.current && onClose()}
      className={`m-0 mt-auto max-h-[92dvh] w-full max-w-none rounded-t-2xl bg-white p-0 shadow-xl backdrop:bg-slate-900/50 sm:m-auto sm:rounded-2xl ${width}`}
    >
      {open && (
        <div className="flex max-h-[92dvh] flex-col">
          <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
            <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Cerrar">
              <X className="size-5" />
            </button>
          </header>
          <div className="overflow-y-auto px-4 py-4">{children}</div>
          {footer && <footer className="safe-bottom flex flex-wrap justify-end gap-2 border-t border-slate-100 px-4 py-3">{footer}</footer>}
        </div>
      )}
    </dialog>,
    document.body,
  );
}

/** "Are you sure?" dialog for destructive actions. */
export function ConfirmDialog({ open, onClose, onConfirm, title, children, confirmLabel = 'Confirmar', tone = 'danger', loading = false, error }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Volver
          </Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="space-y-3 text-sm text-slate-700">
        {children}
        <ErrorAlert error={error} />
      </div>
    </Modal>
  );
}
