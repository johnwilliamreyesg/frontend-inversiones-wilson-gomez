import { useState } from 'react';
import { KeyRound, Pencil, Plus, ShieldCheck, Trash2, UserPlus, Users } from 'lucide-react';
import { ADMIN_ROLE_NAME, useDeleteRole, useRoles, useUsers } from './users.queries.js';
import { ResetPasswordDialog, UserDialog } from './UserDialogs.jsx';
import { RoleDialog } from './RoleDialog.jsx';
import { useAuth } from '../../auth/AuthProvider.jsx';
import { useUrlFilters } from '../../hooks/useUrlFilters.js';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Pagination, SearchInput, SegmentedControl } from '../../components/ui/ListControls.jsx';
import { ConfirmDialog } from '../../components/ui/Modal.jsx';
import { Badge, EmptyState, ErrorState, LoadingState } from '../../components/ui/Feedback.jsx';
import { formatDateTime } from '../../utils/format.js';

const TABS = [
  { value: 'users', label: 'Usuarios' },
  { value: 'roles', label: 'Roles' },
];

export function UsersPage() {
  const [filters, setFilters] = useUrlFilters({ tab: 'users', search: '', page: '1' });
  return (
    <>
      <PageHeader title="Usuarios y roles" />
      <div className="mb-4">
        <SegmentedControl label="Sección" options={TABS} value={filters.tab} onChange={(tab) => setFilters({ tab })} />
      </div>
      {filters.tab === 'users' ? <UsersTab filters={filters} setFilters={setFilters} /> : <RolesTab />}
    </>
  );
}

function UsersTab({ filters, setFilters }) {
  const { user: me } = useAuth();
  const { data, error, isPending, refetch } = useUsers({ search: filters.search, page: filters.page });
  const [editing, setEditing] = useState(null); // { user } ; user null = new
  const [resetting, setResetting] = useState(null);

  return (
    <>
      <div className="mb-4 flex flex-wrap gap-3">
        <SearchInput className="min-w-60 flex-1" value={filters.search} onChange={(search) => setFilters({ search })} placeholder="Buscar por nombre o correo" />
        <Button icon={UserPlus} onClick={() => setEditing({ user: null })}>
          Nuevo usuario
        </Button>
      </div>
      {isPending ? (
        <LoadingState />
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : data.data.length === 0 ? (
        <Card>
          <EmptyState icon={Users} title="Ningún usuario coincide" />
        </Card>
      ) : (
        <>
          <Card padded={false}>
            <ul className="divide-y divide-slate-100">
              {data.data.map((user) => (
                <li key={user.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2">
                      <span className={`font-medium ${user.isActive ? 'text-slate-900' : 'text-slate-400'}`}>{user.fullName}</span>
                      <Badge tone="info">{user.roleName}</Badge>
                      {!user.isActive && <Badge>Inactivo</Badge>}
                      {user.id === me.id && <Badge tone="success">Usted</Badge>}
                    </p>
                    <p className="truncate text-sm text-slate-500">
                      {user.email} · Último ingreso: {user.lastLoginAt ? formatDateTime(user.lastLoginAt) : 'nunca'}
                    </p>
                  </div>
                  <button type="button" onClick={() => setEditing({ user })} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label={`Editar ${user.fullName}`}>
                    <Pencil className="size-4" />
                  </button>
                  {user.id !== me.id && (
                    <button type="button" onClick={() => setResetting(user)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label={`Restablecer contraseña de ${user.fullName}`}>
                      <KeyRound className="size-4" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </Card>
          <Pagination meta={data.meta} onPageChange={(page) => setFilters({ page })} />
        </>
      )}
      <UserDialog open={Boolean(editing)} user={editing?.user} isSelf={editing?.user?.id === me.id} onClose={() => setEditing(null)} />
      <ResetPasswordDialog user={resetting} onClose={() => setResetting(null)} />
    </>
  );
}

function RolesTab() {
  const { data: roles, error, isPending, refetch } = useRoles();
  const remove = useDeleteRole();
  const [editing, setEditing] = useState(null); // { role } ; role null = new
  const [deleting, setDeleting] = useState(null);

  if (isPending) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button icon={Plus} onClick={() => setEditing({ role: null })}>
          Nuevo rol
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {roles.map((role) => {
          const isAdmin = role.name === ADMIN_ROLE_NAME;
          return (
            <Card key={role.id}>
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 size-5 shrink-0 text-brand-700" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900">{role.name}</p>
                  {role.description && <p className="text-sm text-slate-500">{role.description}</p>}
                  <p className="mt-1 text-sm text-slate-600">
                    {isAdmin ? 'Todos los permisos' : `${role.permissions.length} permiso(s)`} · {role.userCount} usuario(s)
                  </p>
                </div>
                {isAdmin ? (
                  <Badge>Del sistema</Badge>
                ) : (
                  <div className="flex">
                    <button type="button" onClick={() => setEditing({ role })} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label={`Editar rol ${role.name}`}>
                      <Pencil className="size-4" />
                    </button>
                    <button type="button" onClick={() => setDeleting(role)} className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-700" aria-label={`Eliminar rol ${role.name}`}>
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
      <RoleDialog open={Boolean(editing)} role={editing?.role} onClose={() => setEditing(null)} />
      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => {
          setDeleting(null);
          remove.reset();
        }}
        onConfirm={() => remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}
        title="Eliminar rol"
        confirmLabel="Eliminar rol"
        loading={remove.isPending}
        error={remove.error}
      >
        {deleting && <p>Se eliminará el rol «{deleting.name}». Solo es posible si ningún usuario lo tiene asignado.</p>}
      </ConfirmDialog>
    </>
  );
}
