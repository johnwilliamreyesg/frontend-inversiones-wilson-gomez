// Single place that reads Vite's build-time variables (import.meta.env).
export const env = {
  apiUrl: (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, ''),
};
