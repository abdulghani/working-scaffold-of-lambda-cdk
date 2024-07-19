import { useEffect, useRef } from "react";

export function useServiceWorker() {
  const registeredRef = useRef(false);

  useEffect(() => {
    if (!registeredRef.current && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw").then(() => {
        registeredRef.current = true;
      });
    }
  }, [registeredRef]);
}
