import AppBar from '@mui/material/AppBar';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';

import { NavLink, Outlet } from 'react-router';

import { ColorModeToggle } from '@/components/ColorModeToggle';
import { navItems } from '@/routes';

export function RootLayout() {
  return (
    <>
      <AppBar position="sticky" enableColorOnDark>
        <Toolbar>
          <Typography variant="h6" component="span" sx={{ mr: 3 }}>
            {import.meta.env.VITE_APP_TITLE}
          </Typography>
          <Stack component="nav" direction="row" spacing={1} sx={{ flexGrow: 1 }}>
            {navItems.map(({ to, label }) => (
              <Button
                key={to}
                component={NavLink}
                to={to}
                end
                color="inherit"
                // Tint follows the text color, so it shows on light and dark app bars.
                sx={{
                  '&.active': { bgcolor: 'color-mix(in srgb, currentColor 15%, transparent)' },
                }}
              >
                {label}
              </Button>
            ))}
          </Stack>
          <ColorModeToggle />
        </Toolbar>
      </AppBar>
      <Container component="main" maxWidth="md" sx={{ py: 4 }}>
        <Outlet />
      </Container>
    </>
  );
}
