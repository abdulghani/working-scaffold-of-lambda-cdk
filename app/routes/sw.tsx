import { LoaderFunctionArgs } from "@remix-run/node";

const SW_SCRIPT = `
self.addEventListener("install", (event) => {
  console.log("Service worker installed");

  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  console.log("Service worker activated");

  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  console.log("PUSH EVENT", event);
});
`.trim();

export async function loader({ request }: LoaderFunctionArgs) {
  return new Response(SW_SCRIPT, {
    headers: {
      "Content-Type": "application/javascript"
    }
  });
}
