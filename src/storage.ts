import { useEffect, useState } from "react";

export function useLocalStorageState<T>(key: string, initialValue: T, normalize?: (value: unknown) => T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = window.localStorage.getItem(key);
      if (!stored) {
        return initialValue;
      }
      const parsed = JSON.parse(stored) as unknown;
      return normalize ? normalize(parsed) : (parsed as T);
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Local persistence is a convenience; the app should still run if storage is unavailable.
    }
  }, [key, value]);

  return [value, setValue] as const;
}

export function uid(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.round(Math.random() * 10000)}`;
}
