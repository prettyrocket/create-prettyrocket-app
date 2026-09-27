import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import App from '@/App';
import { renderWithProviders } from '@/test/render';

describe('App', () => {
  it('shows the app title in the app bar', () => {
    renderWithProviders(<App />);
    expect(screen.getByRole('banner')).toHaveTextContent(import.meta.env.VITE_APP_TITLE);
  });
});
