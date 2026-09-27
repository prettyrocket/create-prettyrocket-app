import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ColorModeToggle } from '@/components/ColorModeToggle';
import { renderWithProviders } from '@/test/render';

describe('ColorModeToggle', () => {
  it('cycles system -> light -> dark -> system', async () => {
    const { user } = renderWithProviders(<ColorModeToggle />);

    for (const mode of ['light', 'dark', 'system']) {
      await user.click(screen.getByRole('button'));
      expect(screen.getByRole('button')).toHaveAccessibleName(`Theme: ${mode}`);
    }
  });
});
