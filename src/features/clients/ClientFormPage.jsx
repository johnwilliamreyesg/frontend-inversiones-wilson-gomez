import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useClient, useSaveClient } from './clients.queries.js';
import { CLIENT_FIELDS, COUNTRY_CODES, clientSchema, emptyClient, toClientForm } from './client.schema.js';
import { applyServerErrors } from '../../utils/form-errors.js';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { SelectField, TextAreaField, TextField } from '../../components/ui/Field.jsx';
import { ErrorAlert, ErrorState, LoadingState } from '../../components/ui/Feedback.jsx';

/** Create (/clients/new) and edit (/clients/:id/edit) share this page. */
export function ClientFormPage() {
  const { id } = useParams();
  const { data: client, error, isPending, refetch } = useClient(id);

  if (!id) return <ClientForm />;
  if (isPending) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  return <ClientForm client={client} />;
}

function ClientForm({ client }) {
  const navigate = useNavigate();
  const save = useSaveClient(client?.id);
  const [generalError, setGeneralError] = useState(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(clientSchema), defaultValues: client ? toClientForm(client) : emptyClient });

  // A code saved before that is not in the list still has to be selectable.
  const codes = client && !COUNTRY_CODES.some(({ code }) => code === client.phoneCountryCode)
    ? [...COUNTRY_CODES, { code: client.phoneCountryCode, country: 'Otro' }]
    : COUNTRY_CODES;

  const onSubmit = async (values) => {
    setGeneralError(null);
    try {
      const saved = await save.mutateAsync(values);
      navigate(`/clients/${saved.id}`, { replace: true });
    } catch (error) {
      if (!applyServerErrors(error, setError, CLIENT_FIELDS)) setGeneralError(error);
    }
  };

  const backTo = client ? `/clients/${client.id}` : '/clients';
  return (
    <>
      <PageHeader title={client ? 'Editar cliente' : 'Nuevo cliente'} subtitle={client?.fullName} backTo={backTo} />
      <Card className="max-w-2xl">
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <ErrorAlert error={generalError} />
          <TextField label="Nombre completo" required autoComplete="off" error={errors.fullName?.message} {...register('fullName')} />
          <TextField label="Cédula" required autoComplete="off" inputClassName="uppercase" error={errors.nationalId?.message} {...register('nationalId')} />
          <div className="grid grid-cols-[8.5rem_1fr] gap-3">
            <SelectField label="Indicativo" error={errors.phoneCountryCode?.message} {...register('phoneCountryCode')}>
              {codes.map(({ code, country }) => (
                <option key={code} value={code}>
                  {code} {country}
                </option>
              ))}
            </SelectField>
            <TextField label="Celular" required type="tel" inputMode="tel" autoComplete="off" placeholder="300 123 4567" error={errors.phoneNumber?.message} {...register('phoneNumber')} />
          </div>
          <TextField label="Dirección" autoComplete="off" error={errors.address?.message} {...register('address')} />
          <TextAreaField label="Notas" hint="Por ejemplo: dónde trabaja, qué día paga." error={errors.notes?.message} {...register('notes')} />
          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <Button variant="secondary" to={backTo}>
              Cancelar
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {client ? 'Guardar cambios' : 'Registrar cliente'}
            </Button>
          </div>
        </form>
      </Card>
    </>
  );
}
