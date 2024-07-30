type Self = ServiceWorkerGlobalScope & { localforage: any };
declare let self: Self;

importScripts(
  "https://pranaga-images.s3.ap-southeast-1.amazonaws.com/localforage.min.js"
);

const CLIENT_MANIFEST = ["{{client_manifest}}"];
const VERSION = "{{version}}";
const LOGO =
  "https://pranaga-random-bucket.s3.ap-southeast-1.amazonaws.com/pranaga-light-192.png";
const CLIENT_MANIFEST_MAP = Object.fromEntries(
  CLIENT_MANIFEST.map((url) => [url, true])
);

async function precache() {
  if (caches?.open) {
    const keys = await caches.keys();
    if (keys.length) {
      await Promise.all(keys.map((key) => caches.delete(key)));
    }
    const cache = await caches.open(VERSION);
    await cache.addAll(
      CLIENT_MANIFEST.map((url) => new Request(url, { mode: "no-cors" }))
    );
  }
}

self.addEventListener("fetch", function (event) {
  if (
    event.request.method === "GET" &&
    CLIENT_MANIFEST_MAP[event.request.url]
  ) {
    event.respondWith(
      caches.match(event.request).then(function (response) {
        if (response) {
          return response;
        }
        return fetch(event.request).then(function (response) {
          if (response?.status !== 200) {
            return response;
          }
          const responseToCache = response.clone();
          caches.open(VERSION).then(function (cache) {
            cache.put(event.request, responseToCache);
          });
          return response;
        });
      })
    );
  }
});

self.addEventListener("install", function (event) {
  console.log("Service worker installed (" + VERSION + ")");
  event.waitUntil(Promise.all([precache(), self.skipWaiting()]));
});

self.addEventListener("activate", function (event) {
  console.log("Service worker activated (" + VERSION + ")");
  event.waitUntil(Promise.all([self.clients.claim()]));
});

function sortNotifications(notifications: any[]) {
  return (notifications || []).sort((a, b) => {
    return b.timestamp?.localeCompare?.(a.timestamp) || 0;
  });
}

async function showNotification(data: any) {
  await self.registration.showNotification(data?.title, {
    body: data?.description,
    icon: LOGO,
    badge: LOGO,
    data
  });

  const notifications = (await self.localforage.getItem("notifications")) || [];
  notifications.push(data);
  const unread = notifications.filter((n: any) => !n.read_at);
  if (unread.length && navigator?.setAppBadge) {
    await navigator.setAppBadge(unread.length);
  } else if (!unread.length && navigator?.clearAppBadge) {
    await navigator.clearAppBadge();
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

async function openNotification(data: any) {
  const path = data?.path || "/admin";
  await self.clients.openWindow(path);

  const notifications = (await self.localforage.getItem("notifications")) || [];
  const id = notifications.findIndex((n: any) => n.id === data.id);
  if (id !== -1) {
    notifications[id].read_at = new Date().toISOString();
  }
  const unread = notifications.filter((n: any) => !n.read_at);
  if (unread.length && navigator?.setAppBadge) {
    await navigator.setAppBadge(unread.length);
  } else if (!unread.length && navigator?.clearAppBadge) {
    await navigator.clearAppBadge();
  }
  await self.localforage.setItem(
    "notifications",
    sortNotifications(notifications)
  );
}

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  event.waitUntil(openNotification(event.notification?.data || {}));
});
