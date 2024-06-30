import { useEffect, useState } from "react";

export function useLocalStorageState(key: string, defaultValue: any) {
  const [state, setState] = useState(defaultValue);

  useEffect(() => {
    const value = window.localStorage.getItem(key);
    if (value) {
      setState(JSON.parse(value));
    }
  }, []);

  useEffect(() => {
    if (defaultValue !== state) {
      window.localStorage.setItem(key, JSON.stringify(state));
    }
  }, [key, state]);

  return [state, setState];
}
