import type { ReactElement, ReactNode } from 'react';

import { ThemeProvider } from '@mui/material/styles';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type RenderOptions, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter } from 'react-router';

import { routes } from '@/routes';
import { theme } from '@/theme';

/** render() wrapped in the app's providers, plus a userEvent instance. */
export function renderWithProviders(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  // Fresh client per test so cached data never leaks between tests; no retries
  // so failing queries fail fast.
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  function Providers({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme} noSsr>
          {children}
        </ThemeProvider>
      </QueryClientProvider>
    );
  }

  return {
    user: userEvent.setup(),
    queryClient,
    ...render(ui, { wrapper: Providers, ...options }),
  };
}

/** Render the full app (layout + routes) at `path`, using an in-memory router. */
export function renderRoute(path = '/') {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  return { router, ...renderWithProviders(<RouterProvider router={router} />) };
}
