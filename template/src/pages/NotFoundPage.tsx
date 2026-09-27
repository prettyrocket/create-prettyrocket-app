import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { Link } from 'react-router';

export function NotFoundPage() {
  return (
    <>
      <Typography variant="h4" component="h1" gutterBottom>
        Page not found
      </Typography>
      <Typography sx={{ mb: 2 }}>There&apos;s nothing at this address.</Typography>
      <Button component={Link} to="/" variant="contained">
        Go home
      </Button>
    </>
  );
}
