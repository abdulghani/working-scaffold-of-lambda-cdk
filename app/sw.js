importScripts(
  "https://pranaga-images.s3.ap-southeast-1.amazonaws.com/localforage.min.js"
);

const localforage = self.localforage;
const BUNDLE_MANIFEST = ["{{bundleManifest}}"];
const VERSION = "{{version}}";
const LOGO =
  "https://pranaga-images.s3.ap-southeast-1.amazonaws.com/light-192.png";

self.addEventListener("install", function (event) {
  console.log(`Service worker installed (${VERSION})`);
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", function (event) {
  console.log(`Service worker activated (${VERSION})`);
  event.waitUntil(Promise.all([self.clients.claim()]));
});

function sortNotifications(notifications) {
  const result = structuredClone(notifications || []).sort((a, b) => {
    return b.timestamp?.localeCompare?.(a.timestamp) || 0;
  });

  if (result.length > 100) {
    result.splice(100, result.length);
  }

  return result;
}

async function readNotification(notification) {
  if (!notification.read_at) {
    const notifications = (await localforage.getItem("notifications")) || [];
    const id = notifications.findIndex((n) => n.id === notification.id);
    if (id !== -1) {
      notifications[id].read_at = new Date().toISOString();
    }
    const unread = notifications.filter((n) => !n.read_at);
    localforage.setItem("notifications", sortNotifications(notifications));
    if (unread.length && navigator?.setAppBadge) {
      await navigator.setAppBadge(unread.length);
    } else if (!unread.length && navigator?.clearAppBadge) {
      await navigator.clearAppBadge();
    }
  }
}

// handle event in postmessage
self.addEventListener("message", (event) => {
  event.waitUntil(
    (async () => {
      switch (event.data?._action) {
        case "READ_NOTIFICATION": {
          await readNotification(event.data);
          break;
        }
        default: {
          break;
        }
      }
    })()
  );
});

async function showNotification(data) {
  await self.registration.showNotification(data?.title, {
    body: data?.description,
    icon: LOGO,
    badge: LOGO,
    data
  });

  const notifications = (await self.localforage.getItem("notifications")) || [];
  notifications.push(data);
  const unread = notifications.filter((n) => !n.read_at);
  if (unread.length && navigator?.setAppBadge) {
    await navigator.setAppBadge(unread.length);
  } else if (!unread.length && navigator?.clearAppBadge) {
    await navigator.clearAppBadge();
  }
  await localforage.setItem("notifications", sortNotifications(notifications));
}

self.addEventListener("push", function (event) {
  const data = JSON.parse(event.data?.text() || "{}");
  event.waitUntil(showNotification(data));
});

async function openNotification(data) {
  const path = data?.path || "/admin";
  await self.clients.openWindow(path);

  const notifications = (await localforage.getItem("notifications")) || [];
  const id = notifications.findIndex((n) => n.id === data.id);
  if (id !== -1) {
    notifications[id].read_at = new Date().toISOString();
  }
  const unread = notifications.filter((n) => !n.read_at);
  if (unread.length && navigator?.setAppBadge) {
    await navigator.setAppBadge(unread.length);
  } else if (!unread.length && navigator?.clearAppBadge) {
    await navigator.clearAppBadge();
  }
  await localforage.setItem("notifications", sortNotifications(notifications));
}

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  event.waitUntil(openNotification(event.notification?.data || {}));
});
