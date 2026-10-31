import { z } from 'zod';

// Same rule as the backend (auth.validators newPassword): 8+ chars, a letter and a digit.
// The backend also rejects more than 72 bytes (bcrypt limit) and gives its own message.
export const newPassword = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres.')
  .refine((value) => /[A-Za-z]/.test(value) && /[0-9]/.test(value), 'La contraseña debe tener al menos una letra y un número.');
