import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderRoute } from '@/test/render';

describe('routes', () => {
  it('shows the app title in the app bar', () => {
    renderRoute('/');
    expect(screen.getByRole('banner')).toHaveTextContent(import.meta.env.VITE_APP_TITLE);
  });

  it('renders the home page at /', () => {
    renderRoute('/');
    expect(screen.getByRole('heading', { level: 1, name: 'Welcome' })).toBeInTheDocument();
  });

  it('navigates via the app bar links', async () => {
    const { user, router } = renderRoute('/');
    await user.click(screen.getByRole('link', { name: 'About' }));
    expect(router.state.location.pathname).toBe('/about');
    expect(screen.getByRole('heading', { level: 1, name: 'About' })).toBeInTheDocument();
  });

  it('shows the not-found page for unknown paths', () => {
    renderRoute('/does-not-exist');
    expect(screen.getByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument();
  });
});
