import { useState } from 'react';
import { Button } from './Button.jsx';
import { errorMessage } from '../../api/api-error.js';

/**
 * Button that fetches a file and then saves or prints it. `load` resolves to
 * { blob, filename }; `onFile` does something with it (saveFile, printPdf).
 * Shows a spinner meanwhile and the error, if any, under the button.
 */
export function DownloadButton({ load, onFile, icon, children, variant = 'secondary', size, className }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      onFile(await load());
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setBusy(false);
    }
  };

  return (
    <span className="inline-flex flex-col">
      <Button variant={variant} size={size} icon={icon} loading={busy} onClick={run} className={className}>
        {children}
      </Button>
      {error && <span className="mt-1 text-xs text-red-600">{error}</span>}
    </span>
  );
}
