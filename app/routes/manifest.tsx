import { json, LoaderFunctionArgs } from "@remix-run/node";
import { serverOnly$ } from "vite-env-only/macros";
import logoDark144 from "../assets/kios-dark-144.png?url";
import logoDark192 from "../assets/kios-dark-192.png?url";
import logoDark256 from "../assets/kios-dark-256.png?url";
import logoDark512 from "../assets/kios-dark-512.png?url";
import logo144 from "../assets/kios-light-144.png?url";
import logo192 from "../assets/kios-light-192.png?url";
import logo256 from "../assets/kios-light-256.png?url";
import logo512 from "../assets/kios-light-512.png?url";

const PRANAGA_ENV = serverOnly$(process.env.PRANAGA_ENV || "stable");

export async function loader({ request }: LoaderFunctionArgs) {
  const isDev = PRANAGA_ENV !== "stable";

  return json({
    name: isDev ? "Kios Dev" : "Pranaga Kios",
    short_name: isDev ? "Kios Dev" : "Kios",
    start_url: "/admin",
    display: "standalone",
    background_color: "#ffffff",
    description: "Pranaga Kios App",
    icons: [
      {
        src: isDev ? logoDark512 : logo512,
        sizes: "512x512",
        type: "image/png",
        purpose: "any"
      },
      {
        src: isDev ? logoDark256 : logo256,
        sizes: "256x256",
        type: "image/png",
        purpose: "any"
      },
      {
        src: isDev ? logoDark192 : logo192,
        sizes: "192x192",
        type: "image/png",
        purpose: "any"
      },
      {
        src: isDev ? logoDark144 : logo144,
        sizes: "144x144",
        type: "image/png",
        purpose: "any"
      }
    ]
  });
}
