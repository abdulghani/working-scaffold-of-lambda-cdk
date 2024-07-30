import packageJSON from "../../package.json";

const SW_SCRIPT = `
importScripts(
  "https://pranaga-images.s3.ap-southeast-1.amazonaws.com/localforage.min.js"
);

const VERSION = "{{version}}";
const LOGO =
  "https://pranaga-random-bucket.s3.ap-southeast-1.amazonaws.com/pranaga-light-192.png";

self.addEventListener("install", function (event) {
  console.log("Service worker installed (" + VERSION + ")");
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", function (event) {
  console.log("Service worker activated (" + VERSION + ")");
  event.waitUntil(Promise.all([self.clients.claim()]));
});

function sortNotifications(notifications) {
  return (notifications || []).sort((a, b) => {
    return b.timestamp?.localeCompare?.(a.timestamp) || 0;
  });
}

async function showNotification(data) {
  await self.registration.showNotification(data?.title, {
    body: data?.description,
    icon: LOGO,
    badge: LOGO,
    data
  });

  const notifications = (await self.localforage.getItem("notifications")) || [];
  notifications.push(data);

  if (navigator?.setAppBadge) {
    await navigator.setAppBadge(notifications.length);
  }

  await self.localforage.setItem(
    "notifications",
    sortNotifications(notifications)
  );
}

self.addEventListener("push", function (event) {
  const data = JSON.parse(event.data?.text() || "{}");
  event.waitUntil(showNotification(data));
});

async function openNotification(data) {
  const path = data?.path || "/admin";
  await self.clients.openWindow(path);

  const notifications = (await self.localforage.getItem("notifications")) || [];
  const filtered = notifications.filter((n) => n.id !== data.id);
  if (navigator?.setAppBadge && filtered.length) {
    await navigator.setAppBadge(filtered.length);
  } else if (navigator?.clearAppBadge && !filtered.length) {
    await navigator.clearAppBadge();
  }
  await self.localforage.setItem("notifications", sortNotifications(filtered));
}

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  event.waitUntil(openNotification(event.notification?.data || {}));
});
`
  .replaceAll("{{version}}", packageJSON.version)
  .trim();

export async function loader() {
  return new Response(SW_SCRIPT, {
    headers: {
      "Content-Type": "application/javascript"
    }
  });
}
