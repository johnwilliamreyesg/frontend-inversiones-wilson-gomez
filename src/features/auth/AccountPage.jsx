import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../auth/AuthProvider.jsx';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { Card, DescriptionList } from '../../components/ui/Card.jsx';
import { TextField } from '../../components/ui/Field.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Alert, ErrorAlert } from '../../components/ui/Feedback.jsx';
import { applyServerErrors } from '../../utils/form-errors.js';
import { newPassword } from './password.schema.js';

const schema = z
  .object({
    currentPassword: z.string().min(1, 'Escriba su contraseña actual.'),
    newPassword,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, { message: 'Las contraseñas no coinciden.', path: ['confirmPassword'] });

export function AccountPage() {
  const { user, changePassword } = useAuth();
  const [result, setResult] = useState({ error: null, done: false });
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema), defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' } });

  const onSubmit = async ({ currentPassword, newPassword: password }) => {
    setResult({ error: null, done: false });
    try {
      await changePassword({ currentPassword, newPassword: password });
      reset();
      setResult({ error: null, done: true });
    } catch (error) {
      const onField = applyServerErrors(error, setError, ['currentPassword', 'newPassword']);
      setResult({ error: onField ? null : error, done: false });
    }
  };

  return (
    <>
      <PageHeader title="Mi cuenta" />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Mis datos">
          <DescriptionList
            items={[
              { label: 'Nombre', value: user.fullName },
              { label: 'Correo', value: user.email },
              { label: 'Rol', value: user.roleName },
            ]}
          />
        </Card>
        <Card title="Cambiar contraseña">
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            {result.done && <Alert tone="success">Contraseña cambiada. Las sesiones abiertas en otros dispositivos se cerraron.</Alert>}
            <ErrorAlert error={result.error} />
            <TextField label="Contraseña actual" type="password" autoComplete="current-password" error={errors.currentPassword?.message} {...register('currentPassword')} />
            <TextField
              label="Nueva contraseña"
              type="password"
              autoComplete="new-password"
              hint="Mínimo 8 caracteres, con al menos una letra y un número."
              error={errors.newPassword?.message}
              {...register('newPassword')}
            />
            <TextField label="Repita la nueva contraseña" type="password" autoComplete="new-password" error={errors.confirmPassword?.message} {...register('confirmPassword')} />
            <Button type="submit" loading={isSubmitting}>
              Cambiar contraseña
            </Button>
          </form>
        </Card>
      </div>
    </>
  );
}
