import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router';
import { AuthProvider } from '../auth/AuthProvider.jsx';
import { ApiError } from '../api/api-error.js';
import { router } from './router.jsx';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Lists are considered fresh for 30 s; after that they reload in the background.
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      // Retry only network/server failures, never 4xx (they would fail the same way).
      retry: (failureCount, error) => failureCount < 2 && !(error instanceof ApiError && error.status >= 400 && error.status < 500),
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>
  );
}
