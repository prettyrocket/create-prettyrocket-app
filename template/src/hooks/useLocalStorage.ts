import { useCallback, useMemo, useState, useSyncExternalStore } from 'react';

// Same-tab listeners: the `storage` event only fires in *other* tabs.
const listeners = new Set<() => void>();

// Values that couldn't be saved (quota exceeded, storage blocked). They still
// work for this page load, just without persisting.
const unsaved = new Map<string, string>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener('storage', onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener('storage', onChange);
  };
}

function readRaw(key: string): string | null {
  if (unsaved.has(key)) return unsaved.get(key)!;
  try {
    return localStorage.getItem(key);
  } catch {
    return null; // storage blocked (e.g. some private modes)
  }
}

function writeRaw(key: string, raw: string) {
  try {
    localStorage.setItem(key, raw);
    unsaved.delete(key);
  } catch {
    unsaved.set(key, raw);
  }
}

function parse<T>(raw: string | null, fallback: T): T {
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/**
 * Like useState, but the value is saved to localStorage as JSON under `key`
 * and stays in sync across components and browser tabs.
 *
 * As with useState, only the first `initialValue` is used, so passing an
 * inline `[]` or `{}` is fine.
 */
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [fallback] = useState(initialValue);
  const raw = useSyncExternalStore(
    subscribe,
    () => readRaw(key),
    () => null,
  );
  // Re-parse only when the stored string changes, so objects keep their identity.
  const value = useMemo(() => parse(raw, fallback), [raw, fallback]);

  const setValue = useCallback(
    (next: T | ((prev: T) => T)) => {
      const prev = parse(readRaw(key), fallback);
      const resolved = next instanceof Function ? next(prev) : next;
      writeRaw(key, JSON.stringify(resolved));
      listeners.forEach((listener) => listener());
    },
    [key, fallback],
  );

  return [value, setValue] as const;
}
