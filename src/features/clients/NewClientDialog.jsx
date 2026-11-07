import { Modal } from '../../components/ui/Modal.jsx';
import { ClientForm } from './ClientForm.jsx';
import { initialValuesFromSearch } from './client.schema.js';

/** Register a client without leaving the current screen (e.g. the new loan form). */
export function NewClientDialog({ open, search, onClose, onCreated }) {
  return (
    <Modal open={open} onClose={onClose} title="Nuevo cliente">
      {open && (
        <ClientForm
          initialValues={initialValuesFromSearch(search)}
          onCancel={onClose}
          onSaved={(client) => {
            onCreated(client);
            onClose();
          }}
        />
      )}
    </Modal>
  );
}
