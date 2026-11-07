import { z } from 'zod';

// Same rules as the backend (client.validators.js), so most mistakes are
// caught before sending. The backend still validates everything.
export const clientSchema = z.object({
  fullName: z.string().trim().min(3, 'El nombre debe tener al menos 3 caracteres.').max(150, 'El nombre admite máximo 150 caracteres.'),
  nationalId: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[0-9A-Z-]{3,20}$/, 'La cédula debe tener entre 3 y 20 letras, números o guiones.'),
  phoneCountryCode: z.string().regex(/^[+][0-9]{1,4}$/, 'El indicativo debe tener el formato +57.'),
  phoneNumber: z
    .string()
    .transform((value) => value.replace(/[\s-]/g, ''))
    .pipe(z.string().regex(/^[0-9]{6,15}$/, 'El teléfono debe tener entre 6 y 15 dígitos.')),
  address: z.string().trim().max(255, 'Máximo 255 caracteres.'),
  notes: z.string().trim().max(2000, 'Máximo 2000 caracteres.'),
});

export const CLIENT_FIELDS = Object.keys(clientSchema.shape);

export const emptyClient = { fullName: '', nationalId: '', phoneCountryCode: '+57', phoneNumber: '', address: '', notes: '' };

/** Client from the API → form values (null → ''). */
export const toClientForm = (client) => ({
  ...emptyClient,
  ...Object.fromEntries(CLIENT_FIELDS.map((field) => [field, client[field] ?? emptyClient[field]])),
});

// Phone country codes offered in the client form, grouped for the <select>.
// Colombia first (the default); then all of America and the 10 largest
// economies of Europe, alphabetically. Every country of the North American
// plan (USA, Canada, Puerto Rico, Dominican Rep., Jamaica, Bahamas...) shares
// +1: the area code is part of the number, so one option covers them all.
export const COUNTRY_CODE_GROUPS = [
  {
    region: 'América',
    countries: [
      { code: '+57', country: 'Colombia' },
      { code: '+54', country: 'Argentina' },
      { code: '+297', country: 'Aruba' },
      { code: '+501', country: 'Belice' },
      { code: '+591', country: 'Bolivia' },
      { code: '+55', country: 'Brasil' },
      { code: '+56', country: 'Chile' },
      { code: '+506', country: 'Costa Rica' },
      { code: '+53', country: 'Cuba' },
      { code: '+599', country: 'Curazao' },
      { code: '+593', country: 'Ecuador' },
      { code: '+1', country: 'EE. UU., Canadá y Caribe' },
      { code: '+503', country: 'El Salvador' },
      { code: '+502', country: 'Guatemala' },
      { code: '+594', country: 'Guayana Francesa' },
      { code: '+592', country: 'Guyana' },
      { code: '+509', country: 'Haití' },
      { code: '+504', country: 'Honduras' },
      { code: '+52', country: 'México' },
      { code: '+505', country: 'Nicaragua' },
      { code: '+507', country: 'Panamá' },
      { code: '+595', country: 'Paraguay' },
      { code: '+51', country: 'Perú' },
      { code: '+597', country: 'Surinam' },
      { code: '+598', country: 'Uruguay' },
      { code: '+58', country: 'Venezuela' },
    ],
  },
  {
    region: 'Europa',
    countries: [
      { code: '+49', country: 'Alemania' },
      { code: '+32', country: 'Bélgica' },
      { code: '+34', country: 'España' },
      { code: '+33', country: 'Francia' },
      { code: '+39', country: 'Italia' },
      { code: '+31', country: 'Países Bajos' },
      { code: '+48', country: 'Polonia' },
      { code: '+44', country: 'Reino Unido' },
      { code: '+46', country: 'Suecia' },
      { code: '+41', country: 'Suiza' },
    ],
  },
];

export const COUNTRY_CODES = COUNTRY_CODE_GROUPS.flatMap(({ countries }) => countries);

/** What was typed in the search becomes the name, or the ID if it is a number. */
export const initialValuesFromSearch = (search) => {
  const text = String(search ?? '').trim();
  if (!text) return {};
  return /^[\d.\s-]+$/.test(text) ? { nationalId: text.replace(/\D/g, '') } : { fullName: text };
};
