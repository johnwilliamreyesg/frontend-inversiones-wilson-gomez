import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router';
import { KeyRound, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../../auth/AuthProvider.jsx';
import { visibleNavigation } from './navigation.js';

const linkClasses = ({ isActive }) =>
  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
    isActive ? 'bg-brand-700 text-white' : 'text-slate-700 hover:bg-slate-100'
  }`;

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid size-9 place-items-center rounded-lg bg-brand-700 text-sm font-bold text-white">WG</span>
      <span className="leading-tight">
        <span className="block text-sm font-bold text-slate-900">Inversiones</span>
        <span className="block text-xs text-slate-500">Wilson Gómez</span>
      </span>
    </div>
  );
}

function NavList({ items }) {
  return (
    <ul className="space-y-1">
      {items.map(({ to, label, icon: Icon, end }) => (
        <li key={to}>
          <NavLink to={to} end={end} className={linkClasses}>
            <Icon className="size-5 shrink-0" aria-hidden="true" />
            {label}
          </NavLink>
        </li>
      ))}
    </ul>
  );
}

function UserBox({ user, onLogout }) {
  return (
    <div className="border-t border-slate-200 pt-3">
      <p className="truncate px-3 text-sm font-semibold text-slate-900">{user.fullName}</p>
      <p className="truncate px-3 text-xs text-slate-500">{user.roleName}</p>
      <div className="mt-2 space-y-1">
        <NavLink to="/account" className={linkClasses}>
          <KeyRound className="size-5" aria-hidden="true" />
          Cambiar contraseña
        </NavLink>
        <button type="button" onClick={onLogout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100">
          <LogOut className="size-5" aria-hidden="true" />
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}

/**
 * Desktop: fixed sidebar. Phone: top bar + bottom bar with the main
 * sections (thumb-reachable) and a "Más" drawer with everything else.
 */
export function AppLayout() {
  const { user, can, logout } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();
  const items = visibleNavigation(can);
  const primaryItems = items.filter((item) => item.primary);

  // Close the drawer after navigating.
  useEffect(() => setDrawerOpen(false), [location.pathname]);

  return (
    <div className="min-h-dvh lg:pl-64">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col gap-6 border-r border-slate-200 bg-white p-4 lg:flex">
        <Brand />
        <nav className="flex-1 overflow-y-auto" aria-label="Menú principal">
          <NavList items={items} />
        </nav>
        <UserBox user={user} onLogout={logout} />
      </aside>

      {/* Phone top bar */}
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur lg:hidden">
        <Brand />
        <button type="button" onClick={() => setDrawerOpen(true)} className="rounded-lg p-2 text-slate-700 hover:bg-slate-100" aria-label="Abrir menú">
          <Menu className="size-6" />
        </button>
      </header>

      {/* Phone drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menú">
          <button type="button" className="absolute inset-0 bg-slate-900/50" onClick={() => setDrawerOpen(false)} aria-label="Cerrar menú" />
          <div className="absolute inset-y-0 right-0 flex w-72 max-w-[85vw] flex-col gap-5 bg-white p-4 shadow-xl">
            <div className="flex items-center justify-between">
              <Brand />
              <button type="button" onClick={() => setDrawerOpen(false)} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100" aria-label="Cerrar menú">
                <X className="size-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto" aria-label="Menú">
              <NavList items={items} />
            </nav>
            <UserBox user={user} onLogout={logout} />
          </div>
        </div>
      )}

      <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-5 sm:px-6 lg:pb-10 lg:pt-8">
        <Outlet />
      </main>

      {/* Phone bottom bar */}
      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white lg:hidden" aria-label="Accesos rápidos">
        <ul className="grid" style={{ gridTemplateColumns: `repeat(${primaryItems.length + 1}, minmax(0, 1fr))` }}>
          {primaryItems.map(({ to, label, icon: Icon, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${isActive ? 'text-brand-700' : 'text-slate-500'}`
                }
              >
                <Icon className="size-6" aria-hidden="true" />
                {label}
              </NavLink>
            </li>
          ))}
          <li>
            <button type="button" onClick={() => setDrawerOpen(true)} className="flex w-full flex-col items-center gap-0.5 py-2 text-[11px] font-medium text-slate-500">
              <Menu className="size-6" aria-hidden="true" />
              Más
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
}
