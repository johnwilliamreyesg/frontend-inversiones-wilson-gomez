import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSaveClient } from './clients.queries.js';
import { CLIENT_FIELDS, COUNTRY_CODES, COUNTRY_CODE_GROUPS, clientSchema, emptyClient, toClientForm } from './client.schema.js';
import { applyServerErrors } from '../../utils/form-errors.js';
import { Button } from '../../components/ui/Button.jsx';
import { SelectField, TextAreaField, TextField } from '../../components/ui/Field.jsx';
import { ErrorAlert } from '../../components/ui/Feedback.jsx';

/**
 * Client fields + save. Used by the client page and by the "new client"
 * dialog of the loan form. `initialValues` pre-fills a new client.
 */
export function ClientForm({ client, initialValues, onSaved, onCancel, cancelTo }) {
  const save = useSaveClient(client?.id);
  const [generalError, setGeneralError] = useState(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(clientSchema),
    defaultValues: client ? toClientForm(client) : { ...emptyClient, ...initialValues },
  });

  // A code saved before that is not in the list still has to be selectable.
  const unlistedCode = client && !COUNTRY_CODES.some(({ code }) => code === client.phoneCountryCode) ? client.phoneCountryCode : null;

  const onSubmit = async (values) => {
    setGeneralError(null);
    try {
      onSaved(await save.mutateAsync(values));
    } catch (error) {
      if (!applyServerErrors(error, setError, CLIENT_FIELDS)) setGeneralError(error);
    }
  };

  return (
    <form
      // Inside a dialog this form may sit (in React's tree) within another form:
      // its submit must not reach the outer one.
      onSubmit={(event) => {
        event.stopPropagation();
        return handleSubmit(onSubmit)(event);
      }}
      noValidate
      className="space-y-4"
    >
      <ErrorAlert error={generalError} />
      <TextField label="Nombre completo" required autoComplete="off" autoFocus={!client} error={errors.fullName?.message} {...register('fullName')} />
      <TextField label="Cédula" required autoComplete="off" inputClassName="uppercase" error={errors.nationalId?.message} {...register('nationalId')} />
      <div className="grid grid-cols-[10rem_1fr] gap-3">
        <SelectField label="Indicativo" error={errors.phoneCountryCode?.message} {...register('phoneCountryCode')}>
          {COUNTRY_CODE_GROUPS.map(({ region, countries }) => (
            <optgroup key={region} label={region}>
              {countries.map(({ code, country }) => (
                <option key={code} value={code}>
                  {code} {country}
                </option>
              ))}
            </optgroup>
          ))}
          {unlistedCode && <option value={unlistedCode}>{unlistedCode} Otro</option>}
        </SelectField>
        <TextField label="Celular" required type="tel" inputMode="tel" autoComplete="off" placeholder="300 123 4567" error={errors.phoneNumber?.message} {...register('phoneNumber')} />
      </div>
      <TextField label="Dirección" autoComplete="off" error={errors.address?.message} {...register('address')} />
      <TextAreaField label="Notas" hint="Por ejemplo: dónde trabaja, qué día paga." error={errors.notes?.message} {...register('notes')} />
      <div className="flex flex-wrap justify-end gap-2 pt-2">
        <Button variant="secondary" to={cancelTo} onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {client ? 'Guardar cambios' : 'Registrar cliente'}
        </Button>
      </div>
    </form>
  );
}
