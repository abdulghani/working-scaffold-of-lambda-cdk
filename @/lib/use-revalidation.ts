import { useRevalidator } from "@remix-run/react";
import { useEffect, useRef } from "react";

const REVALIDATOR_INTERVAL = 15_000; /** 15 SECONDS */

export function useRevalidation() {
  const revalidator = useRevalidator();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  function revalidate() {
    if (
      document.visibilityState === "visible" &&
      revalidator.state === "idle"
    ) {
      revalidator.revalidate();
    }
  }

  useEffect(() => {
    window.addEventListener("visibilitychange", revalidate);

    return () => {
      window.removeEventListener("visibilitychange", revalidate);
    };
  });

  useEffect(() => {
    if (!intervalRef.current) {
      intervalRef.current = setInterval(revalidate, REVALIDATOR_INTERVAL);
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);
}
