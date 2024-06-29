import { Settings } from "luxon";

export function initializeLocale() {
  Settings.defaultLocale = process.env.DATETIME_LOCALE || "en";
}
