import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), tailwindcss()],
    build: {
      rollupOptions: {
        output: {
          // Libraries change rarely: a separate file stays cached in the phone between app updates.
          manualChunks: { vendor: ['react', 'react-dom', 'react-router', '@tanstack/react-query', 'react-hook-form', 'zod'] },
        },
      },
    },
    server: {
      port: 5173,
      // In development the browser calls /api on the Vite server and Vite
      // forwards it to the backend: same origin, so no CORS setup is needed.
      proxy: {
        '/api': { target: env.DEV_API_PROXY_TARGET || 'http://localhost:3000', changeOrigin: true },
      },
    },
  };
});
