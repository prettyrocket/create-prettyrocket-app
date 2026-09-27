import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { renderRoute } from '@/test/render';

// Make one real page throw, then check the app's own route config handles it.
vi.mock('@/pages/AboutPage', () => ({
  AboutPage: () => {
    throw new Error('Kaboom');
  },
}));

describe('ErrorPage', () => {
  it('shows the error inside the layout when a page throws', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {}); // React logs caught errors
    renderRoute('/about');

    expect(screen.getByRole('heading', { name: 'Something went wrong' })).toBeInTheDocument();
    expect(screen.getByText('Kaboom')).toBeInTheDocument();
    // The app bar survives, so the user can navigate away.
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument();
  });
});
