import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import { Link, isRouteErrorResponse, useRouteError } from 'react-router';

/** Shown inside the layout when rendering or loading a page throws. */
export function ErrorPage() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : 'Unknown error';

  return (
    <>
      <Typography variant="h4" component="h1" gutterBottom>
        Something went wrong
      </Typography>
      <Typography component="pre" sx={{ mb: 2, whiteSpace: 'pre-wrap', color: 'error.main' }}>
        {message}
      </Typography>
      <Button component={Link} to="/" variant="contained">
        Go home
      </Button>
    </>
  );
}

/** Last resort, for when the layout itself throws: same page, without the app bar. */
export function RootErrorPage() {
  return (
    <Container component="main" maxWidth="md" sx={{ py: 4 }}>
      <ErrorPage />
    </Container>
  );
}
