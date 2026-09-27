import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Link from '@mui/material/Link';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import Typography from '@mui/material/Typography';

import { useLinks } from '@/api';
import { useLocalStorage } from '@/hooks/useLocalStorage';

export function HomePage() {
  const [count, setCount] = useLocalStorage('home.count', 0);
  const links = useLinks();

  return (
    <>
      <Typography variant="h4" component="h1" gutterBottom>
        Welcome
      </Typography>
      <Typography sx={{ mb: 2 }}>
        Edit <code>src/pages/HomePage.tsx</code> to get started.
      </Typography>

      <Button variant="contained" onClick={() => setCount((n) => n + 1)}>
        Clicked {count} {count === 1 ? 'time' : 'times'}
      </Button>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        Saved in localStorage, so it survives a reload.
      </Typography>

      <Typography variant="h6" component="h2" sx={{ mt: 4 }}>
        Docs
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Loaded from <code>public/links.json</code> with TanStack Query.
      </Typography>
      {links.isPending && <CircularProgress size={24} sx={{ mt: 2 }} aria-label="Loading links" />}
      {links.isError && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {links.error.message}
        </Alert>
      )}
      {links.isSuccess && (
        <List>
          {links.data.map((link) => (
            <ListItem key={link.url} disableGutters>
              <Link href={link.url} target="_blank" rel="noreferrer">
                {link.title}
              </Link>
            </ListItem>
          ))}
        </List>
      )}
    </>
  );
}
