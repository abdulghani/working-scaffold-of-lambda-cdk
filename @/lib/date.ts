import { Settings } from "luxon";

export function initializeLocale() {
  /** TODO: BASE THIS FROM ENV WITHOUT HAVING ISSUE WITH HYDRATION, VITE, LAMBDA ENV */
  Settings.defaultLocale = "id";
}
