import { signal } from "@preact/signals-react";
import { useEffect } from "react";

/** USE SIGNAL */
const isRegistered = signal<any>(false);

export function useSW() {
  useEffect(() => {
    if (!isRegistered.value && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw").then(() => {
        isRegistered.value = true;
      });
    }
  }, [isRegistered.value]);
}
