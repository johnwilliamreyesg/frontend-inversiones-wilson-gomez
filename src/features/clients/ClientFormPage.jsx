import { useNavigate, useParams } from 'react-router';
import { useClient } from './clients.queries.js';
import { ClientForm } from './ClientForm.jsx';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { ErrorState, LoadingState } from '../../components/ui/Feedback.jsx';

/** Create (/clients/new) and edit (/clients/:id/edit) share this page. */
export function ClientFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: client, error, isPending, refetch } = useClient(id);

  if (id && isPending) return <LoadingState />;
  if (id && error) return <ErrorState error={error} onRetry={refetch} />;

  const backTo = client ? `/clients/${client.id}` : '/clients';
  return (
    <>
      <PageHeader title={client ? 'Editar cliente' : 'Nuevo cliente'} subtitle={client?.fullName} backTo={backTo} />
      <Card className="max-w-2xl">
        <ClientForm client={client} cancelTo={backTo} onSaved={(saved) => navigate(`/clients/${saved.id}`, { replace: true })} />
      </Card>
    </>
  );
}
