declare let self: ServiceWorkerGlobalScope;

self.addEventListener("install", (event) => {
  console.log("Service worker installed");

  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  console.log("Service worker activated");

  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  const data = JSON.parse(event.data?.text() || "{}");
  self.registration.showNotification(data?.title, {
    body: data?.description,
    icon: "https://pranaga-random-bucket.s3.ap-southeast-1.amazonaws.com/pranaga-light-192.png",
    badge:
      "https://pranaga-random-bucket.s3.ap-southeast-1.amazonaws.com/pranaga-light-192.png",
    data: {
      url: data?.path
    }
  });
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clientsArr) => {
      // If a Window tab matching the targeted URL already exists, focus that;
      const hadWindowToFocus = clientsArr.some((windowClient) =>
        windowClient.url === event.notification.data.url
          ? (windowClient.focus(), true)
          : false
      );
      // Otherwise, open a new tab to the applicable URL and focus it.
      if (!hadWindowToFocus)
        self.clients
          .openWindow(event.notification.data.url)
          .then((windowClient) => (windowClient ? windowClient.focus() : null));
    })
  );
});
