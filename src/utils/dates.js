export const BUSINESS_TIME_ZONE = 'America/Bogota';

/** Business "today" as 'YYYY-MM-DD' in Colombian time (same rule as the backend Clock). */
export const today = (now = new Date()) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: BUSINESS_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);

/** '2026-10-31' → '2026-10-01' */
export const startOfMonth = (isoDate) => `${isoDate.slice(0, 7)}-01`;

/** Last day of the month of isoDate, as 'YYYY-MM-DD'. */
export const endOfMonth = (isoDate) => {
  const [year, month] = isoDate.split('-').map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${isoDate.slice(0, 7)}-${String(lastDay).padStart(2, '0')}`;
};

/** Adds whole days to 'YYYY-MM-DD' (UTC math: no daylight-saving surprises). */
export const addDays = (isoDate, days) => {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
};

/** Adds whole months to 'YYYY-MM' → 'YYYY-MM'. */
export const addMonthsToMonth = (isoMonth, months) => {
  const [year, month] = isoMonth.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1 + months, 1)).toISOString().slice(0, 7);
};
