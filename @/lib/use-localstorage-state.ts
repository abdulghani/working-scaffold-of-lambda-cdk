import { useDeferredValue, useEffect, useMemo, useState } from "react";

export function useLocalStorageState(key: string, defaultValue: any) {
  const [state, setState] = useState(defaultValue);
  const shouldUpdate = useDeferredValue(state);
  const storeKey = useMemo(
    () => `@${key}-${import.meta.env.VITE_BUILD_ID || "default"}`,
    [key]
  );

  useEffect(() => {
    const value = window.localStorage.getItem(storeKey);
    if (value) {
      setState(JSON.parse(value));
    }
  }, []);

  useEffect(() => {
    if (defaultValue !== state) {
      window.localStorage.setItem(storeKey, JSON.stringify(state));
    }
  }, [key, shouldUpdate]);

  return [state, setState];
}
