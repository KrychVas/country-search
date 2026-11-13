export interface DebouncedFunction<TArgs extends unknown[]> {
  (...args: TArgs): void;
  cancel(): void;
  flush(): void;
}

/**
 * Delays `fn` until `delay` ms have passed without another call.
 * Every new call resets the pending timer and replaces the arguments.
 */
export function debounce<TArgs extends unknown[]>(
  fn: (...args: TArgs) => void,
  delay: number,
): DebouncedFunction<TArgs> {
  if (!Number.isFinite(delay) || delay < 0) {
    throw new RangeError('delay must be a finite, non-negative number');
  }

  let timer: ReturnType<typeof setTimeout> | undefined;
  let pending: (() => void) | undefined;

  const invoke = (): void => {
    timer = undefined;
    const callback = pending;
    pending = undefined;
    callback?.();
  };

  const debounced = function (this: unknown, ...args: TArgs): void {
    if (timer !== undefined) {
      clearTimeout(timer);
    }

    // The arrow captures both arguments and `this` without aliasing `this`.
    pending = () => fn.apply(this, args);
    timer = setTimeout(invoke, delay);
  } as DebouncedFunction<TArgs>;

  debounced.cancel = (): void => {
    if (timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
    }
    pending = undefined;
  };

  debounced.flush = (): void => {
    if (timer === undefined) {
      return;
    }
    clearTimeout(timer);
    invoke();
  };

  return debounced;
}
