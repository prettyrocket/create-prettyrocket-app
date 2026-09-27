import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { HomePage } from '@/pages/HomePage';
import { renderWithProviders } from '@/test/render';

describe('HomePage', () => {
  it('counts clicks and remembers them', async () => {
    const { user, unmount } = renderWithProviders(<HomePage />);
    await user.click(screen.getByRole('button', { name: 'Clicked 0 times' }));
    await user.click(screen.getByRole('button', { name: 'Clicked 1 time' }));
    unmount();

    renderWithProviders(<HomePage />);
    expect(screen.getByRole('button', { name: 'Clicked 2 times' })).toBeInTheDocument();
  });

  it('lists links loaded from links.json', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      Response.json([{ title: 'Example', url: 'https://example.com/' }]),
    );
    renderWithProviders(<HomePage />);

    expect(await screen.findByRole('link', { name: 'Example' })).toHaveAttribute(
      'href',
      'https://example.com/',
    );
    expect(fetch).toHaveBeenCalledWith('/links.json');
  });

  it('shows an error if links.json fails to load', async () => {
    renderWithProviders(<HomePage />); // fetch answers 404 by default in tests
    expect(await screen.findByRole('alert')).toHaveTextContent('404');
  });
});
