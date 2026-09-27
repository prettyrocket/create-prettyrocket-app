import { useQuery } from '@tanstack/react-query';

/** A non-2xx response. `status` lets callers (and retry logic) tell 404 from 500. */
export class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

/**
 * Resolve `url` for fetch: anything with a scheme (`https:`, `data:`, …) or
 * starting with `//` is used as-is; everything else is a path to a file in
 * public/ and resolves against the app's base URL, with or without a leading slash.
 */
export function resolveUrl(url: string): string {
  if (/^[a-z][a-z\d+.-]*:/i.test(url) || url.startsWith('//')) return url;
  return `${import.meta.env.BASE_URL}${url.replace(/^\/+/, '')}`;
}

/** GET JSON and throw HttpError on non-2xx, so TanStack Query sees failures as errors. */
export async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(resolveUrl(url));
  if (!res.ok) throw new HttpError(res.status, `${res.status} ${res.statusText} loading ${url}`);
  return (await res.json()) as T;
}

export interface Link {
  title: string;
  url: string;
}

/** Example query: loads public/links.json. Copy this shape for real data. */
export function useLinks() {
  return useQuery({
    queryKey: ['links'],
    queryFn: () => fetchJson<Link[]>('links.json'),
  });
}
