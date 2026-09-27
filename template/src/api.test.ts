import { describe, expect, it, vi } from 'vitest';

import { HttpError, fetchJson, resolveUrl } from '@/api';
import { shouldRetry } from '@/queryClient';

describe('resolveUrl', () => {
  // BASE_URL is "/" in tests.
  it('resolves public/ paths against the base URL, with or without a leading slash', () => {
    expect(resolveUrl('links.json')).toBe('/links.json');
    expect(resolveUrl('/links.json')).toBe('/links.json');
    expect(resolveUrl('data/items.json')).toBe('/data/items.json');
  });

  it('leaves URLs with a scheme or host untouched', () => {
    expect(resolveUrl('https://api.example.com/x')).toBe('https://api.example.com/x');
    expect(resolveUrl('//cdn.example.com/x.json')).toBe('//cdn.example.com/x.json');
    expect(resolveUrl('data:application/json,[]')).toBe('data:application/json,[]');
  });
});

describe('fetchJson', () => {
  it('returns parsed JSON', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(Response.json({ ok: true }));
    await expect(fetchJson('x.json')).resolves.toEqual({ ok: true });
  });

  it('throws an HttpError with the status on non-2xx', async () => {
    const error = await fetchJson('missing.json').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(HttpError);
    expect(error).toMatchObject({ status: 404 });
  });
});

describe('shouldRetry', () => {
  it('does not retry client errors', () => {
    expect(shouldRetry(0, new HttpError(404, 'Not Found'))).toBe(false);
  });

  it('retries server and network errors twice', () => {
    expect(shouldRetry(0, new HttpError(503, 'Unavailable'))).toBe(true);
    expect(shouldRetry(1, new TypeError('Failed to fetch'))).toBe(true);
    expect(shouldRetry(2, new TypeError('Failed to fetch'))).toBe(false);
  });
});
