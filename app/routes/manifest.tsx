import { json, LoaderFunctionArgs } from "@remix-run/node";
import logo144 from "../assets/pranaga-light-144.png?url";
import logo192 from "../assets/pranaga-light-192.png?url";
import logo256 from "../assets/pranaga-light-256.png?url";
import logo512 from "../assets/pranaga-light-512.png?url";

export async function loader({ request }: LoaderFunctionArgs) {
  return json({
    name: "Pranaga Kios",
    short_name: "Pranaga Kios",
    start_url: "/admin",
    display: "standalone",
    background_color: "#ffffff",
    description: "Pranaga Kios App",
    icons: [
      {
        src: logo512,
        sizes: "512x512",
        type: "image/png",
        purpose: "any"
      },
      {
        src: logo256,
        sizes: "256x256",
        type: "image/png",
        purpose: "any"
      },
      {
        src: logo192,
        sizes: "192x192",
        type: "image/png",
        purpose: "any"
      },
      {
        src: logo144,
        sizes: "144x144",
        type: "image/png",
        purpose: "any"
      }
    ]
  });
}
