import { Navigate, Outlet, useLocation } from 'react-router';
import { ShieldX } from 'lucide-react';
import { useAuth } from './AuthProvider.jsx';
import { EmptyState, LoadingState } from '../components/ui/Feedback.jsx';
import { Button } from '../components/ui/Button.jsx';

/** Routes inside it need a session; without one the user goes to /login and comes back after. */
export function RequireAuth() {
  const { status } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <LoadingState label="Verificando sesión…" />;
  if (status === 'anonymous') return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}

/** Shows the page only with the permission (a typed URL must not reveal a screen). */
export function RequirePermission({ permission, children }) {
  const { can } = useAuth();
  if (can(permission)) return children ?? <Outlet />;
  return (
    <EmptyState icon={ShieldX} title="No tiene permiso para ver esta sección" action={<Button to="/">Ir al inicio</Button>}>
      Si lo necesita, pídale al administrador que se lo asigne a su rol.
    </EmptyState>
  );
}

/** Renders children only with the permission (buttons, menu entries). */
export function Can({ permission, children }) {
  const { can } = useAuth();
  return can(permission) ? children : null;
}
