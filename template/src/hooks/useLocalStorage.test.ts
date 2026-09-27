import { useEffect, useState } from 'react';

import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useLocalStorage } from '@/hooks/useLocalStorage';

describe('useLocalStorage', () => {
  it('returns the initial value when nothing is stored', () => {
    const { result } = renderHook(() => useLocalStorage('count', 0));
    expect(result.current[0]).toBe(0);
  });

  it('reads an existing stored value', () => {
    localStorage.setItem('count', '5');
    const { result } = renderHook(() => useLocalStorage('count', 0));
    expect(result.current[0]).toBe(5);
  });

  it('persists updates, including functional updates', () => {
    const { result } = renderHook(() => useLocalStorage('count', 0));
    act(() => result.current[1](2));
    act(() => result.current[1]((n) => n + 1));
    expect(result.current[0]).toBe(3);
    expect(localStorage.getItem('count')).toBe('3');
  });

  it('keeps hooks with the same key in sync', () => {
    const a = renderHook(() => useLocalStorage('name', ''));
    const b = renderHook(() => useLocalStorage('name', ''));
    act(() => a.result.current[1]('Ada'));
    expect(b.result.current[0]).toBe('Ada');
  });

  it('falls back to the initial value if stored JSON is invalid', () => {
    localStorage.setItem('count', '{not json');
    const { result } = renderHook(() => useLocalStorage('count', 7));
    expect(result.current[0]).toBe(7);
  });

  it('keeps value and setter identity stable with an inline object initial value', () => {
    localStorage.setItem('favorites', '["a"]');
    const { result, rerender } = renderHook(() => useLocalStorage<string[]>('favorites', []));
    const [firstValue, firstSet] = result.current;
    rerender();
    expect(result.current[0]).toBe(firstValue);
    expect(result.current[1]).toBe(firstSet);
  });

  it('does not re-render forever when an effect depends on the value', () => {
    localStorage.setItem('favorites', '["a"]');
    let renders = 0;
    renderHook(() => {
      renders++;
      const [favorites] = useLocalStorage<string[]>('favorites', []);
      const [, setSeen] = useState(0);
      useEffect(() => {
        // Capped so a regression fails the assertion instead of hanging.
        if (renders < 20) setSeen((n) => n + 1);
      }, [favorites]);
    });
    expect(renders).toBeLessThan(5);
  });

  it('keeps working in memory when storage refuses writes', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    });
    const { result } = renderHook(() => useLocalStorage('unsaved-count', 0));
    act(() => result.current[1](5));
    expect(result.current[0]).toBe(5);
  });
});
