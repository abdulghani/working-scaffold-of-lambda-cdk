import { LoaderFunctionArgs } from "@remix-run/node";

const SW_SCRIPT = `
const LOGO =
  "https://pranaga-random-bucket.s3.ap-southeast-1.amazonaws.com/pranaga-light-192.png";

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
    icon: LOGO,
    badge: LOGO,
    data: {
      url: data?.path
    }
  });
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({ type: "window" });
      const client = clients.find(Boolean);

      if (client) {
        await client.focus();
        await client.navigate(event.notification.data.url);
      } else {
        const newClient = await self.clients.openWindow(
          event.notification.data.url
        );
        if (newClient) {
          await newClient.focus();
        }
      }
    })()
  );
});
`.trim();

export async function loader({ request }: LoaderFunctionArgs) {
  return new Response(SW_SCRIPT, {
    headers: {
      "Content-Type": "application/javascript"
    }
  });
}
