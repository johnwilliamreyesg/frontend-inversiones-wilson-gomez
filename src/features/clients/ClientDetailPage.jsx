import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Banknote, Pencil, Phone, Plus, Trash2 } from 'lucide-react';
import { useClient, useClientLoans, useDeleteClient } from './clients.queries.js';
import { ClientPhotos } from './ClientPhotos.jsx';
import { LoanRows } from '../loans/LoanRows.jsx';
import { Can } from '../../auth/guards.jsx';
import { useAuth } from '../../auth/AuthProvider.jsx';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { Card, DescriptionList } from '../../components/ui/Card.jsx';
import { Button, buttonClasses } from '../../components/ui/Button.jsx';
import { ConfirmDialog } from '../../components/ui/Modal.jsx';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/Feedback.jsx';
import { formatDateTime, formatPhone, phoneHref } from '../../utils/format.js';

export function ClientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { can } = useAuth();
  const { data: client, error, isPending, refetch } = useClient(id);
  const remove = useDeleteClient();
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (isPending) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  return (
    <>
      <PageHeader
        title={client.fullName}
        subtitle={`CC ${client.nationalId}`}
        backTo="/clients"
        actions={
          <>
            <a href={phoneHref(client.phoneCountryCode, client.phoneNumber)} className={buttonClasses({ variant: 'secondary' })}>
              <Phone className="size-4" aria-hidden="true" />
              Llamar
            </a>
            <Can permission="clients.update">
              <Button variant="secondary" icon={Pencil} to={`/clients/${client.id}/edit`}>
                Editar
              </Button>
            </Can>
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-5">
          <Card title="Datos">
            <DescriptionList
              items={[
                { label: 'Celular', value: formatPhone(client.phoneCountryCode, client.phoneNumber) },
                { label: 'Dirección', value: client.address },
                client.notes && { label: 'Notas', value: <span className="whitespace-pre-line">{client.notes}</span> },
                { label: 'Registrado', value: formatDateTime(client.createdAt) },
              ]}
            />
          </Card>
          {can('loans.read') && <ClientLoans clientId={client.id} />}
        </div>
        <div className="space-y-5">
          <ClientPhotos clientId={client.id} />
          <Can permission="clients.delete">
            <Button variant="ghost" icon={Trash2} className="text-red-700 hover:bg-red-50" onClick={() => setConfirmDelete(true)}>
              Eliminar cliente
            </Button>
          </Can>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => {
          setConfirmDelete(false);
          remove.reset();
        }}
        onConfirm={() => remove.mutate(client.id, { onSuccess: () => navigate('/clients', { replace: true }) })}
        title="Eliminar cliente"
        confirmLabel="Eliminar"
        loading={remove.isPending}
        error={remove.error}
      >
        <p>
          <strong>{client.fullName}</strong> dejará de aparecer en las listas. Su historial de créditos y pagos se conserva.
        </p>
        <p>No se puede eliminar mientras tenga créditos abiertos como deudor o codeudor.</p>
      </ConfirmDialog>
    </>
  );
}

function ClientLoans({ clientId }) {
  const { data, error, isPending, refetch } = useClientLoans(clientId);
  const newLoan = (
    <Can permission="loans.create">
      <Button size="sm" icon={Plus} to={`/loans/new?clientId=${clientId}`}>
        Nuevo crédito
      </Button>
    </Can>
  );

  if (isPending) return <Card title="Créditos"><LoadingState /></Card>;
  if (error) return <Card title="Créditos"><ErrorState error={error} onRetry={refetch} /></Card>;

  return (
    <>
      <Card title={`Créditos como deudor (${data.asDebtor.length})`} actions={newLoan} padded={false}>
        {data.asDebtor.length ? (
          <LoanRows loans={data.asDebtor} show="client" />
        ) : (
          <EmptyState icon={Banknote} title="Sin créditos" />
        )}
      </Card>
      {data.asCoDebtor.length > 0 && (
        <Card title={`Es codeudor en (${data.asCoDebtor.length})`} padded={false}>
          <LoanRows loans={data.asCoDebtor} show="coDebtor" />
        </Card>
      )}
    </>
  );
}
