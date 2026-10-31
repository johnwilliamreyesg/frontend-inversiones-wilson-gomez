import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useResetPassword, useRoles, useSaveUser } from './users.queries.js';
import { newPassword } from '../auth/password.schema.js';
import { applyServerErrors } from '../../utils/form-errors.js';
import { Modal } from '../../components/ui/Modal.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { CheckboxField, SelectField, TextField } from '../../components/ui/Field.jsx';
import { Alert, ErrorAlert } from '../../components/ui/Feedback.jsx';

const userFields = {
  fullName: z.string().trim().min(3, 'Mínimo 3 caracteres.').max(150, 'Máximo 150 caracteres.'),
  email: z.string().trim().pipe(z.email('El correo no es válido.')),
  roleId: z.coerce.number({ error: 'Elija el rol.' }).int().positive('Elija el rol.'),
};
const createSchema = z.object({ ...userFields, password: newPassword });
const editSchema = z.object({ ...userFields, isActive: z.boolean() });

/** Create (user = null) or edit a user. `isSelf` blocks changing one's own role or status. */
export function UserDialog({ open, user, isSelf, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title={user ? 'Editar usuario' : 'Nuevo usuario'}>
      {open && <UserForm user={user} isSelf={isSelf} onClose={onClose} />}
    </Modal>
  );
}

function UserForm({ user, isSelf, onClose }) {
  const save = useSaveUser();
  const { data: roles = [] } = useRoles();
  const [generalError, setGeneralError] = useState(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(user ? editSchema : createSchema),
    defaultValues: user
      ? { fullName: user.fullName, email: user.email, roleId: String(user.roleId), isActive: user.isActive }
      : { fullName: '', email: '', roleId: '', password: '' },
  });

  const onSubmit = async (values) => {
    setGeneralError(null);
    // Sending one's own role/status would be refused by the API anyway.
    const body = isSelf ? { fullName: values.fullName, email: values.email } : values;
    try {
      await save.mutateAsync({ id: user?.id, user: body });
      onClose();
    } catch (error) {
      if (!applyServerErrors(error, setError, ['fullName', 'email', 'roleId', 'password', 'isActive'])) setGeneralError(error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <ErrorAlert error={generalError} />
      <TextField label="Nombre completo" required error={errors.fullName?.message} {...register('fullName')} />
      <TextField label="Correo" type="email" required autoComplete="off" error={errors.email?.message} {...register('email')} />
      <SelectField label="Rol" required disabled={isSelf} hint={isSelf ? 'No puede cambiar su propio rol.' : null} error={errors.roleId?.message} {...register('roleId')}>
        <option value="">Elija…</option>
        {roles.map((role) => (
          <option key={role.id} value={role.id}>
            {role.name}
          </option>
        ))}
      </SelectField>
      {user ? (
        <CheckboxField
          label="Usuario activo"
          hint={isSelf ? 'No puede desactivarse a sí mismo.' : 'Al desactivarlo se cierran de inmediato todas sus sesiones.'}
          disabled={isSelf}
          {...register('isActive')}
        />
      ) : (
        <TextField
          label="Contraseña inicial"
          type="text"
          autoComplete="off"
          required
          hint="Comuníquesela al usuario; después la puede cambiar en «Cambiar contraseña»."
          error={errors.password?.message}
          {...register('password')}
        />
      )}
      <div className="flex justify-end gap-2 pt-1">
        <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {user ? 'Guardar cambios' : 'Crear usuario'}
        </Button>
      </div>
    </form>
  );
}

/** Admin sets a new password for someone who forgot theirs. */
export function ResetPasswordDialog({ user, onClose }) {
  return (
    <Modal open={Boolean(user)} onClose={onClose} title="Restablecer contraseña" size="sm">
      {user && <ResetPasswordForm user={user} onClose={onClose} />}
    </Modal>
  );
}

function ResetPasswordForm({ user, onClose }) {
  const reset = useResetPassword();
  const [done, setDone] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(z.object({ newPassword })), defaultValues: { newPassword: '' } });

  if (done) {
    return (
      <div className="space-y-4">
        <Alert tone="success">Contraseña cambiada. Las sesiones abiertas de {user.fullName} se cerraron.</Alert>
        <div className="flex justify-end">
          <Button onClick={onClose}>Listo</Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit((values) => reset.mutateAsync({ id: user.id, newPassword: values.newPassword }).then(() => setDone(true)).catch(() => {}))} noValidate className="space-y-4">
      <p className="text-sm text-slate-600">
        Nueva contraseña para <strong>{user.fullName}</strong>.
      </p>
      <ErrorAlert error={reset.error} />
      <TextField label="Nueva contraseña" type="text" autoComplete="off" error={errors.newPassword?.message} {...register('newPassword')} />
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button type="submit" loading={isSubmitting}>
          Cambiar contraseña
        </Button>
      </div>
    </form>
  );
}
