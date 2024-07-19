import { useEffect, useMemo, useRef } from "react";

export function useInterval(callback: () => void, delay: number) {
  const callbackMemo = useMemo(() => callback, [callback]);
  // use ref prevent re-render https://stackoverflow.com/a/56456055/7280258
  const id = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (id.current) {
      clearInterval(id.current);
    }
    id.current = setInterval(() => callbackMemo(), delay);

    return () => {
      if (id.current) {
        clearInterval(id.current);
      }
      id.current = null;
    };
  }, [callback, callbackMemo, delay, id]);
}
