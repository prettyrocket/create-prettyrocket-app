import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';

import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { RouterProvider } from 'react-router';

import { createQueryClient } from '@/queryClient';
import { createAppRouter } from '@/routes';
import { theme } from '@/theme';

const queryClient = createQueryClient();
const router = createAppRouter();

// noSsr: this app only renders in the browser, so apply the saved or system
// color scheme on the first render instead of after mount (no flash of light mode).
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme} noSsr>
        <CssBaseline enableColorScheme />
        <RouterProvider router={router} />
      </ThemeProvider>
      {/* Only rendered in development; tree-shaken from production builds. */}
      <ReactQueryDevtools buttonPosition="bottom-left" />
    </QueryClientProvider>
  </StrictMode>,
);
