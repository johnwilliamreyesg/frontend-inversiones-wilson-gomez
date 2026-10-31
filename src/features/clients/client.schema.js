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

// Indicativos most likely for Wilson's clients; "Otro" lets the user type any.
export const COUNTRY_CODES = [
  { code: '+57', country: 'Colombia' },
  { code: '+58', country: 'Venezuela' },
  { code: '+593', country: 'Ecuador' },
  { code: '+51', country: 'Perú' },
  { code: '+507', country: 'Panamá' },
  { code: '+52', country: 'México' },
  { code: '+1', country: 'EE. UU.' },
  { code: '+34', country: 'España' },
];
