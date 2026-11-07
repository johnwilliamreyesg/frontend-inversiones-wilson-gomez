import { MessageCircle } from 'lucide-react';
import { buttonClasses } from './Button.jsx';
import { whatsappUrl } from '../../utils/whatsapp.js';

/**
 * Opens WhatsApp (app or web) with the client's chat and the message ready;
 * the admin reviews it and presses Send. Disabled when there is no phone.
 */
export function WhatsAppButton({ countryCode, phoneNumber, message, children = 'WhatsApp', size, block, className = '' }) {
  const classes = buttonClasses({
    variant: 'secondary',
    size,
    block,
    className: `text-emerald-700 ring-emerald-300 hover:bg-emerald-50 ${className}`,
  });
  if (!phoneNumber || !message) {
    return (
      <button type="button" disabled className={classes} title="El cliente no tiene celular registrado">
        <MessageCircle className="size-4 shrink-0" aria-hidden="true" />
        {children}
      </button>
    );
  }
  return (
    <a href={whatsappUrl(countryCode, phoneNumber, message)} target="_blank" rel="noreferrer" className={classes}>
      <MessageCircle className="size-4 shrink-0" aria-hidden="true" />
      {children}
    </a>
  );
}
