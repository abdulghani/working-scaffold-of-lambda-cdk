import { LinksFunction } from "@remix-run/node";
import stylesheet from "./style.css?url";
import { Links, Meta, Outlet, Scripts } from "@remix-run/react";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: stylesheet },
  { rel: "icon", href: "/react.svg" }
];

export default function App() {
  return (
    <html className="">
      <head>
        <title>Remix starter</title>
        <Meta />
        <Links />
      </head>
      <body>
        <Outlet />
        <Scripts />
      </body>
    </html>
  );
}
