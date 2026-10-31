import { Banknote, BarChart3, HandCoins, Home, Receipt, ShieldCheck, Users, Wallet } from 'lucide-react';

/**
 * Menu entries. `permission` hides an entry the user cannot open;
 * `primary` entries go in the phone's bottom bar, the rest under "Más".
 * A new screen is one more line here.
 */
export const NAVIGATION = [
  { to: '/', label: 'Inicio', icon: Home, end: true, primary: true },
  { to: '/collections', label: 'Cobros', icon: HandCoins, permission: 'payments.read', primary: true },
  { to: '/clients', label: 'Clientes', icon: Users, permission: 'clients.read', primary: true },
  { to: '/loans', label: 'Créditos', icon: Banknote, permission: 'loans.read', primary: true },
  { to: '/payments', label: 'Pagos recibidos', icon: Wallet, permission: 'payments.read' },
  { to: '/expenses', label: 'Gastos', icon: Receipt, permission: 'expenses.read' },
  { to: '/reports', label: 'Reportes', icon: BarChart3, permission: 'reports.read' },
  { to: '/users', label: 'Usuarios y roles', icon: ShieldCheck, permission: 'users.manage' },
];

export const visibleNavigation = (can) => NAVIGATION.filter((item) => !item.permission || can(item.permission));
