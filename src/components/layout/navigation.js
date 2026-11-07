import { Banknote, BarChart3, HandCoins, Home, Percent, Receipt, ShieldCheck, Users, Wallet } from 'lucide-react';

/**
 * Menu entries (desktop sidebar and phone drawer). `permission` hides an
 * entry the user cannot open.
 * A new screen is one more line here.
 */
export const NAVIGATION = [
  { to: '/', label: 'Inicio', icon: Home, end: true },
  { to: '/collections', label: 'Cobros', icon: HandCoins, permission: 'payments.read' },
  { to: '/clients', label: 'Clientes', icon: Users, permission: 'clients.read' },
  { to: '/loans', label: 'Créditos', icon: Banknote, permission: 'loans.read' },
  { to: '/payments', label: 'Pagos recibidos', icon: Wallet, permission: 'payments.read' },
  { to: '/expenses', label: 'Gastos', icon: Receipt, permission: 'expenses.read' },
  { to: '/reports', label: 'Reportes', icon: BarChart3, permission: 'reports.read' },
  { to: '/users', label: 'Usuarios y roles', icon: ShieldCheck, permission: 'users.manage' },
  { to: '/interest-rates', label: 'Tasas de interés', icon: Percent, permission: 'interest_rates.manage' },
];

export const visibleNavigation = (can) => NAVIGATION.filter((item) => !item.permission || can(item.permission));
