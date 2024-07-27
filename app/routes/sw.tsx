import packageJSON from "../../package.json";

const SW_SCRIPT = `
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

self.addEventListener("push", function (event) {
  const data = JSON.parse(event.data?.text() || "{}");
  event.waitUntil(
    self.registration.showNotification(data?.title, {
      body: data?.description,
      icon: LOGO,
      badge: LOGO,
      data: {
        url: data?.path
      }
    })
  );
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  event.waitUntil(
    self.clients.openWindow(event.notification?.data?.url || "/admin")
  );
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
