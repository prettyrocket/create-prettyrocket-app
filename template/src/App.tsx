import AppBar from '@mui/material/AppBar';
import Container from '@mui/material/Container';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';

import { ColorModeToggle } from '@/components/ColorModeToggle';

export default function App() {
  return (
    <>
      <AppBar position="sticky" enableColorOnDark>
        <Toolbar>
          <Typography variant="h6" component="span" sx={{ flexGrow: 1 }}>
            {import.meta.env.VITE_APP_TITLE}
          </Typography>
          <ColorModeToggle />
        </Toolbar>
      </AppBar>
      <Container component="main" maxWidth="md" sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Welcome
        </Typography>
        <Typography>
          Edit <code>src/App.tsx</code> to get started.
        </Typography>
      </Container>
    </>
  );
}
