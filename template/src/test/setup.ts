import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';

// jsdom has no matchMedia; MUI's color scheme logic needs it. Report "light".
window.matchMedia ??= (query: string) =>
  ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }) as MediaQueryList;

// Tests never touch the network: fetch answers 404 unless a test mocks it, e.g.
//   vi.mocked(fetch).mockResolvedValueOnce(Response.json([...]))
beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(null, { status: 404, statusText: 'Not Found' })),
  );
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});
