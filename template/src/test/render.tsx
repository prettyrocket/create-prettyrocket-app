import type { ReactElement, ReactNode } from 'react';

import { ThemeProvider } from '@mui/material/styles';

import { type RenderOptions, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter } from 'react-router';

import { routes } from '@/routes';
import { theme } from '@/theme';

function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider theme={theme} noSsr>
      {children}
    </ThemeProvider>
  );
}

/** render() wrapped in the app's providers, plus a userEvent instance. */
export function renderWithProviders(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  return { user: userEvent.setup(), ...render(ui, { wrapper: Providers, ...options }) };
}

/** Render the full app (layout + routes) at `path`, using an in-memory router. */
export function renderRoute(path = '/') {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  return { router, ...renderWithProviders(<RouterProvider router={router} />) };
}
