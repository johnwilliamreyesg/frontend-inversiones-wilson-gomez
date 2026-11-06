import { useState } from 'react';
import { usePermissions, useSaveRole } from './users.queries.js';
import { Modal } from '../../components/ui/Modal.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { TextField } from '../../components/ui/Field.jsx';
import { ErrorAlert, LoadingState } from '../../components/ui/Feedback.jsx';
import { ApiError } from '../../api/api-error.js';

// Permission codes look like "clients.read": group the checkboxes by module.
const MODULE_LABELS = {
  clients: 'Clientes',
  loans: 'Créditos',
  interest_rates: 'Tasas de interés',
  payments: 'Cobros y pagos',
  expenses: 'Gastos',
  reports: 'Reportes',
  users: 'Usuarios y roles',
};

const groupByModule = (permissions) => {
  const groups = new Map();
  for (const permission of permissions) {
    const module = permission.code.split('.')[0];
    if (!groups.has(module)) groups.set(module, []);
    groups.get(module).push(permission);
  }
  return [...groups.entries()];
};

export function RoleDialog({ open, role, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title={role ? `Editar rol «${role.name}»` : 'Nuevo rol'} size="lg">
      {open && <RoleForm role={role} onClose={onClose} />}
    </Modal>
  );
}

function RoleForm({ role, onClose }) {
  const { data: permissions, isPending } = usePermissions();
  const save = useSaveRole();
  const [name, setName] = useState(role?.name ?? '');
  const [description, setDescription] = useState(role?.description ?? '');
  const [selected, setSelected] = useState(() => new Set(role?.permissions ?? []));
  const [nameError, setNameError] = useState(null);

  const toggle = (code) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });

  const submit = (event) => {
    event.preventDefault();
    if (name.trim().length < 3) {
      setNameError('El nombre debe tener entre 3 y 50 caracteres.');
      return;
    }
    setNameError(null);
    save.mutate(
      { id: role?.id, role: { name: name.trim(), description: description.trim() || null, permissions: [...selected] } },
      {
        onSuccess: onClose,
        onError: (error) => error instanceof ApiError && error.fieldErrors().name && setNameError(error.fieldErrors().name),
      },
    );
  };

  if (isPending) return <LoadingState />;

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <ErrorAlert error={save.error && !nameError ? save.error : null} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Nombre" required maxLength={50} value={name} onChange={(event) => setName(event.target.value)} error={nameError} placeholder="Ej.: Cobrador" />
        <TextField label="Descripción" maxLength={255} value={description} onChange={(event) => setDescription(event.target.value)} />
      </div>
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-slate-700">Permisos</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {groupByModule(permissions).map(([module, items]) => (
            <div key={module} className="rounded-lg p-3 ring-1 ring-slate-200">
              <p className="mb-2 text-sm font-semibold text-slate-800">{MODULE_LABELS[module] ?? module}</p>
              <div className="space-y-2">
                {items.map((permission) => (
                  <label key={permission.code} className="flex items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" className="size-4 accent-brand-700" checked={selected.has(permission.code)} onChange={() => toggle(permission.code)} />
                    {permission.description}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </fieldset>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose} disabled={save.isPending}>
          Cancelar
        </Button>
        <Button type="submit" loading={save.isPending}>
          {role ? 'Guardar cambios' : 'Crear rol'}
        </Button>
      </div>
    </form>
  );
}
