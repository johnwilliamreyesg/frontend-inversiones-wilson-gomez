// Spanish labels for the codes the API returns. One place, so every screen says the same.

export const LOAN_STATUS = {
  active: { label: 'Activo', tone: 'info' },
  paid_off: { label: 'Pagado', tone: 'success' },
  defaulted: { label: 'En mora', tone: 'danger' },
  cancelled: { label: 'Cancelado', tone: 'neutral' },
};

export const INSTALLMENT_STATUS = {
  pending: { label: 'Pendiente', tone: 'neutral' },
  partially_paid: { label: 'Abonada', tone: 'warning' },
  paid: { label: 'Pagada', tone: 'success' },
  cancelled: { label: 'Cancelada', tone: 'neutral' },
};

export const FREQUENCY = {
  monthly: 'Mensual',
  biweekly: 'Quincenal',
};

export const PAYMENT_METHOD = {
  cash: 'Efectivo',
  transfer: 'Transferencia',
};

export const label = (map, code) => map[code]?.label ?? map[code] ?? code;
