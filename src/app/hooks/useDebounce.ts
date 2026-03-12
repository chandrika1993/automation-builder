// Debounce helper

import { useEffect, useState } from "react";

/**
 * Returns a debounced copy of `value` that only updates after `ms` milliseconds
 * of silence. Used to batch rapid node/edge changes before validation and save.
 */
export function useDebounce<T>(value: T, ms: number): T {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
      const t = setTimeout(() => setDebounced(value), ms);
      return () => clearTimeout(t);
    }, [value, ms]);
    return debounced;
  }
  