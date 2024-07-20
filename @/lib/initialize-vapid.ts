import webpush from "web-push";

export function initializeVapid() {
  return webpush.setVapidDetails(
    "mailto:info@pranaga.com",
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
}
