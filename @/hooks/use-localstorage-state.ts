import { useDeferredValue, useEffect, useMemo, useState } from "react";
import packageJSON from "../../package.json";

export function useLocalStorageState<T = any>(
  key: string,
  defaultValue: T
): [T, (value: T) => void] {
  const [state, setState] = useState(defaultValue);
  const deferredState = useDeferredValue(state);
  const storeKey = useMemo(
    () => `@${key}-${packageJSON.version || "default"}`,
    [key]
  );

  useEffect(() => {
    const value = window.localStorage.getItem(storeKey);
    if (value) {
      setState(JSON.parse(value));
    }
  }, [storeKey]);

  useEffect(() => {
    if (defaultValue !== deferredState) {
      window.localStorage.setItem(storeKey, JSON.stringify(deferredState));
    }
  }, [key, storeKey, defaultValue, deferredState]);

  return [state, setState];
}
