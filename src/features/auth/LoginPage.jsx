import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react';
import { useAuth } from '../../auth/AuthProvider.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Field, controlClasses } from '../../components/ui/Field.jsx';
import { Alert, ErrorAlert } from '../../components/ui/Feedback.jsx';
import logoWhite from '../../assets/logo-white.png';

const loginSchema = z.object({
  email: z.string().trim().min(1, 'Escriba su correo.').pipe(z.email('El correo no es válido.')),
  password: z.string().min(1, 'Escriba su contraseña.'),
});


export function LoginPage() {
  const { status, notice, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
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
    <div className="min-h-dvh bg-slate-50 lg:grid lg:grid-cols-[1.1fr_1fr]">
      <BrandPanel />

      <main className="relative -mt-8 flex justify-center px-4 pb-10 lg:mt-0 lg:items-center lg:px-10">
        <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl shadow-slate-900/5 ring-1 ring-slate-200/70 sm:p-8 lg:rounded-none lg:bg-transparent lg:p-0 lg:shadow-none lg:ring-0">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Bienvenido</h1>
          <p className="mt-1 text-sm text-slate-500">Ingrese con su correo y contraseña.</p>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-6 space-y-4">
            {notice && <Alert tone="warning">{notice}</Alert>}
            <ErrorAlert error={error} />
            <Field label="Correo" error={errors.email?.message}>
              {(aria) => (
                <IconInput icon={Mail}>
                  <input
                    type="email"
                    autoComplete="username"
                    inputMode="email"
                    autoFocus
                    placeholder="nombre@correo.com"
                    className={controlClasses(errors.email, 'h-12 pl-10')}
                    {...aria}
                    {...register('email')}
                  />
                </IconInput>
              )}
            </Field>
            <Field label="Contraseña" error={errors.password?.message}>
              {(aria) => (
                <IconInput icon={LockKeyhole}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className={controlClasses(errors.password, 'h-12 pl-10 pr-11')}
                    {...aria}
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((shown) => !shown)}
                    className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-lg text-slate-400 hover:text-slate-700"
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                  </button>
                </IconInput>
              )}
            </Field>
            <Button type="submit" block size="lg" loading={isSubmitting} className="mt-6! rounded-xl! shadow-lg shadow-brand-700/20">
              Ingresar
            </Button>
          </form>

          <p className="mt-8 text-center text-xs text-slate-400">© {new Date().getFullYear()} Inversiones Wilson Gómez</p>
        </div>
      </main>
    </div>
  );
}

/** Teal panel with the signature: a band on top on phones, the left half on desktop. */
function BrandPanel() {
  return (
    <aside className="relative overflow-hidden bg-gradient-to-br from-brand-700 via-brand-800 to-brand-900 px-6 pb-16 pt-12 text-white lg:flex lg:flex-col lg:justify-between lg:px-14 lg:py-12">
      {/* Soft light shapes for depth. */}
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-brand-500/30 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 -left-16 size-80 rounded-full bg-teal-300/15 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:22px_22px]" />

      <p className="relative text-center text-xs font-semibold uppercase tracking-[0.25em] text-brand-100/80 lg:text-left">Inversiones</p>

      <div className="relative mx-auto mt-4 max-w-md text-center lg:mx-0 lg:mt-0 lg:text-left">
        <img src={logoWhite} alt="Inversiones Wilson Gómez" className="mx-auto h-24 w-auto drop-shadow-sm sm:h-28 lg:mx-0 lg:h-36" />
        <h2 className="mt-10 hidden text-3xl font-semibold leading-tight tracking-tight lg:block">
          Créditos y cobranza,
          <br />
          en orden y al día.
        </h2>
      </div>

      <p className="relative hidden text-xs text-brand-100/60 lg:block">Uso exclusivo del personal autorizado.</p>
    </aside>
  );
}

function IconInput({ icon: Icon, children }) {
  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
      {children}
    </div>
  );
}
