import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useExpenseCategories, useSaveExpense } from './expenses.queries.js';
import { applyServerErrors } from '../../utils/form-errors.js';
import { today as getToday } from '../../utils/dates.js';
import { Modal } from '../../components/ui/Modal.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { MoneyField } from '../../components/ui/MoneyField.jsx';
import { SelectField, TextField } from '../../components/ui/Field.jsx';
import { ErrorAlert } from '../../components/ui/Feedback.jsx';

const FIELDS = ['categoryId', 'expenseDate', 'amount', 'description'];

const expenseSchema = (today) =>
  z.object({
    categoryId: z.coerce.number({ error: 'Elija la categoría.' }).int().positive('Elija la categoría.'),
    expenseDate: z.string().min(1, 'Elija la fecha.').refine((date) => date <= today, 'La fecha no puede ser futura.'),
    amount: z.number({ error: 'Escriba el valor.' }).positive('El valor debe ser mayor que cero.'),
    description: z.string().trim().min(3, 'Describa el gasto (mínimo 3 caracteres).').max(255, 'Máximo 255 caracteres.'),
  });

/** Create (expense = null) or edit an expense. */
export function ExpenseDialog({ open, expense, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title={expense ? 'Editar gasto' : 'Registrar gasto'}>
      {open && <ExpenseForm expense={expense} onClose={onClose} />}
    </Modal>
  );
}

function ExpenseForm({ expense, onClose }) {
  const today = getToday();
  const save = useSaveExpense();
  const { data: categories = [] } = useExpenseCategories();
  const [generalError, setGeneralError] = useState(null);
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(expenseSchema(today)),
    defaultValues: expense
      ? { categoryId: String(expense.categoryId), expenseDate: expense.expenseDate, amount: expense.amount, description: expense.description }
      : { categoryId: '', expenseDate: today, amount: null, description: '' },
  });

  // An expense may stay in a category deactivated later: keep it selectable.
  const options =
    expense && !categories.some((category) => category.id === expense.categoryId)
      ? [...categories, { id: expense.categoryId, name: `${expense.categoryName} (inactiva)` }]
      : categories;

  const onSubmit = async (values) => {
    setGeneralError(null);
    try {
      await save.mutateAsync({ id: expense?.id, expense: values });
      onClose();
    } catch (error) {
      if (!applyServerErrors(error, setError, FIELDS)) setGeneralError(error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <ErrorAlert error={generalError} />
      <SelectField label="Categoría" required error={errors.categoryId?.message} {...register('categoryId')}>
        <option value="">Elija…</option>
        {options.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </SelectField>
      <Controller control={control} name="amount" render={({ field }) => <MoneyField label="Valor" required error={errors.amount?.message} {...field} />} />
      <TextField label="Descripción" required placeholder="Ej.: gasolina de la moto" error={errors.description?.message} {...register('description')} />
      <TextField label="Fecha" type="date" max={today} error={errors.expenseDate?.message} {...register('expenseDate')} />
      <div className="flex justify-end gap-2 pt-1">
        <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {expense ? 'Guardar cambios' : 'Registrar gasto'}
        </Button>
      </div>
    </form>
  );
}
