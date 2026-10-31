import { ApiError } from '../api/api-error.js';

/**
 * Copies the API's field errors (400 details) into a react-hook-form form,
 * so each message appears under its input. Returns true if any field matched
 * one of the form's fields; otherwise the caller shows the general message.
 *
 * @param {unknown} error
 * @param {(field: string, error: { type: string, message: string }) => void} setError
 * @param {string[]} fieldNames fields that exist in the form
 */
export const applyServerErrors = (error, setError, fieldNames) => {
  if (!(error instanceof ApiError)) return false;
  let applied = false;
  for (const [field, message] of Object.entries(error.fieldErrors())) {
    if (fieldNames.includes(field)) {
      setError(field, { type: 'server', message });
      applied = true;
    }
  }
  return applied;
};
