import { createTheme, lighten } from '@mui/material/styles';

// Per-app accent color: change this first when starting a new app. Pick one
// dark enough for white text (the light-mode app bar).
const ACCENT = '#6750a4';

export const theme = createTheme({
  // CSS variables let MUI switch light/dark without re-rendering, and persist
  // the user's choice to localStorage. `data` sets <html data-light|data-dark>.
  cssVariables: { colorSchemeSelector: 'data' },
  colorSchemes: {
    light: { palette: { primary: { main: ACCENT } } },
    // Links and text buttons use primary as their text color; a lighter shade
    // keeps them readable on the dark background.
    dark: { palette: { primary: { main: lighten(ACCENT, 0.4) } } },
  },
});
