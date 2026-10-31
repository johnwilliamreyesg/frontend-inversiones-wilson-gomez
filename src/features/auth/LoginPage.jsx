import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../auth/AuthProvider.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { TextField } from '../../components/ui/Field.jsx';
import { Alert, ErrorAlert } from '../../components/ui/Feedback.jsx';

const loginSchema = z.object({
  email: z.string().trim().min(1, 'Escriba su correo.').pipe(z.email('El correo no es válido.')),
  password: z.string().min(1, 'Escriba su contraseña.'),
});

export function LoginPage() {
  const { status, notice, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } });

  // Where the user was going before being sent to the login.
  const from = location.state?.from?.pathname ?? '/';
  if (status === 'authenticated') return <Navigate to={from} replace />;

  const onSubmit = async (credentials) => {
    setError(null);
    try {
      await login(credentials);
      navigate(from, { replace: true });
    } catch (loginError) {
      setError(loginError);
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-gradient-to-b from-brand-800 to-brand-900 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center text-white">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-white/15 text-xl font-bold">WG</span>
          <h1 className="mt-4 text-2xl font-bold">Inversiones Wilson Gómez</h1>
          <p className="mt-1 text-sm text-brand-100">Créditos y cobranza</p>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4 rounded-2xl bg-white p-6 shadow-xl">
          {notice && <Alert tone="warning">{notice}</Alert>}
          <ErrorAlert error={error} />
          <TextField
            label="Correo"
            type="email"
            autoComplete="username"
            inputMode="email"
            autoFocus
            error={errors.email?.message}
            {...register('email')}
          />
          <TextField label="Contraseña" type="password" autoComplete="current-password" error={errors.password?.message} {...register('password')} />
          <Button type="submit" block size="lg" loading={isSubmitting}>
            Ingresar
          </Button>
        </form>
      </div>
    </div>
  );
}
