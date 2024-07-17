import { clientOnly$ } from "vite-env-only/macros";

export const isNotificationSupported = clientOnly$(function () {
  return (
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
});
