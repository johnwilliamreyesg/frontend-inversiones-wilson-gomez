import { createBrowserRouter } from 'react-router';
import { SearchX } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout.jsx';
import { RequireAuth, RequirePermission } from '../auth/guards.jsx';
import { EmptyState } from '../components/ui/Feedback.jsx';
import { Button } from '../components/ui/Button.jsx';
import { LoginPage } from '../features/auth/LoginPage.jsx';
import { AccountPage } from '../features/auth/AccountPage.jsx';
import { DashboardPage } from '../features/dashboard/DashboardPage.jsx';
import { ClientListPage } from '../features/clients/ClientListPage.jsx';
import { ClientFormPage } from '../features/clients/ClientFormPage.jsx';
import { ClientDetailPage } from '../features/clients/ClientDetailPage.jsx';
import { LoanListPage } from '../features/loans/LoanListPage.jsx';
import { LoanFormPage } from '../features/loans/LoanFormPage.jsx';
import { LoanDetailPage } from '../features/loans/LoanDetailPage.jsx';
import { CollectionsPage } from '../features/collections/CollectionsPage.jsx';
import { PaymentListPage } from '../features/payments/PaymentListPage.jsx';
import { ExpenseListPage } from '../features/expenses/ExpenseListPage.jsx';
import { ExpenseCategoriesPage } from '../features/expenses/ExpenseCategoriesPage.jsx';
import { ReportsPage } from '../features/reports/ReportsPage.jsx';
import { UsersPage } from '../features/users/UsersPage.jsx';

function NotFoundPage() {
  return (
    <EmptyState icon={SearchX} title="Esta página no existe" action={<Button to="/">Ir al inicio</Button>}>
      Revise la dirección o vuelva al inicio.
    </EmptyState>
  );
}

/** Wraps a page so it opens only with that permission. */
const guarded = (permission, element) => <RequirePermission permission={permission}>{element}</RequirePermission>;

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: 'account', element: <AccountPage /> },

          { path: 'clients', element: guarded('clients.read', <ClientListPage />) },
          { path: 'clients/new', element: guarded('clients.create', <ClientFormPage />) },
          { path: 'clients/:id', element: guarded('clients.read', <ClientDetailPage />) },
          { path: 'clients/:id/edit', element: guarded('clients.update', <ClientFormPage />) },

          { path: 'loans', element: guarded('loans.read', <LoanListPage />) },
          { path: 'loans/new', element: guarded('loans.create', <LoanFormPage />) },
          { path: 'loans/:id', element: guarded('loans.read', <LoanDetailPage />) },

          { path: 'collections', element: guarded('payments.read', <CollectionsPage />) },
          { path: 'payments', element: guarded('payments.read', <PaymentListPage />) },

          { path: 'expenses', element: guarded('expenses.read', <ExpenseListPage />) },
          { path: 'expenses/categories', element: guarded('expenses.read', <ExpenseCategoriesPage />) },

          { path: 'reports', element: guarded('reports.read', <ReportsPage />) },
          { path: 'users', element: guarded('users.manage', <UsersPage />) },

          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
]);
