import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { debounce } from '../src/core/debounce.js';

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not call the function before the delay elapses', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 300);

    debounced();

    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(299);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('restarts the timer when called again and uses the latest arguments', () => {
    const fn = vi.fn<(value: string) => void>();
    const debounced = debounce(fn, 300);

    debounced('sp');
    vi.advanceTimersByTime(200);
    debounced('spain');
    vi.advanceTimersByTime(299);

    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('spain');
  });

  it('cancels a pending call', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 300);

    debounced();
    debounced.cancel();
    vi.advanceTimersByTime(1000);

    expect(fn).not.toHaveBeenCalled();
  });

  it('preserves the call context and can be reused after firing', () => {
    const contexts: unknown[] = [];
    const fn = vi.fn(function (this: { value: number }, value: string) {
      contexts.push(this);
      expect(value).toBe('first');
    });
    const debounced = debounce(fn, 100);
    const context = { value: 42 };

    debounced.call(context, 'first');
    vi.advanceTimersByTime(100);
    debounced.call(context, 'first');
    vi.advanceTimersByTime(100);

    expect(contexts).toEqual([context, context]);
  });
});
