const LOCALE = 'es-CO';

const moneyFormatter = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});
const numberFormatter = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 2 });

/** 1250000 → "$ 1.250.000" */
export const formatMoney = (value) => (value === null || value === undefined ? '—' : moneyFormatter.format(value));

/** 1250000 → "1.250.000" (for inputs) */
export const formatNumber = (value) => (value === null || value === undefined || value === '' ? '' : numberFormatter.format(value));

/** "1.250.000" or "1250000" → 1250000; "" → null. Only whole pesos (Colombian pesos have no cents in practice). */
export const parseMoneyInput = (text) => {
  const digits = String(text ?? '').replace(/\D/g, '');
  return digits ? Number(digits) : null;
};

/** 52.17 → "52,17 %" */
export const formatPercent = (value) => (value === null || value === undefined ? '—' : `${numberFormatter.format(value)} %`);

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MONTHS_LONG = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/**
 * "2026-10-31" → "31 oct 2026". Works on the text directly: building a
 * Date from "YYYY-MM-DD" is read as UTC and can show the previous day.
 */
export const formatDate = (isoDate) => {
  if (!isoDate) return '—';
  const [year, month, day] = isoDate.slice(0, 10).split('-').map(Number);
  return `${day} ${MONTHS[month - 1]} ${year}`;
};

/** "2026-10" → "Octubre 2026" */
export const formatMonth = (isoMonth) => {
  const [year, month] = isoMonth.split('-').map(Number);
  const name = MONTHS_LONG[month - 1];
  return `${name[0].toUpperCase()}${name.slice(1)} ${year}`;
};

/** "2026-10" → "oct" */
export const formatMonthShort = (isoMonth) => MONTHS[Number(isoMonth.slice(5, 7)) - 1];

const dateTimeFormatter = new Intl.DateTimeFormat(LOCALE, {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'America/Bogota',
});

/** Timestamp (ISO with time) → "31 oct 2026, 3:00 p. m." in Colombian time. */
export const formatDateTime = (timestamp) => (timestamp ? dateTimeFormatter.format(new Date(timestamp)) : '—');

/** "+57", "3001234567" → "+57 300 123 4567" */
export const formatPhone = (countryCode, number) => {
  if (!number) return '—';
  const grouped = number.length === 10 ? `${number.slice(0, 3)} ${number.slice(3, 6)} ${number.slice(6)}` : number;
  return countryCode ? `${countryCode} ${grouped}` : grouped;
};

/** Link for the phone dialer: "tel:+573001234567" */
export const phoneHref = (countryCode, number) => `tel:${countryCode ?? ''}${number}`;

/** Days as text: 1 → "1 día", 5 → "5 días" */
export const formatDays = (days) => `${days} ${days === 1 ? 'día' : 'días'}`;
