import { useRevalidator } from "@remix-run/react";
import { useCallback, useEffect } from "react";

export function useRevalidation() {
  const revalidator = useRevalidator();
  const revalidate = useCallback(
    function () {
      if (
        document.visibilityState === "visible" &&
        revalidator.state === "idle"
      ) {
        revalidator.revalidate();
      }
    },
    [revalidator]
  );

  useEffect(() => {
    window.addEventListener("visibilitychange", revalidate);
    return () => {
      window.removeEventListener("visibilitychange", revalidate);
    };
  }, [revalidate]);
}
