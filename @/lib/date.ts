import { Settings } from "luxon";
import { useMemo } from "react";

export function initializeLocale() {
  /** TODO: BASE THIS FROM ENV WITHOUT HAVING ISSUE WITH HYDRATION, VITE, LAMBDA ENV */
  Settings.defaultLocale = "id";
}

export function useInitializeLocale() {
  useMemo(() => initializeLocale(), []);
}
