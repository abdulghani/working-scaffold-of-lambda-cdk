import { LinksFunction } from "@remix-run/node";
import stylesheet from "./style.css?url";
import { Links, Meta, Outlet, Scripts } from "@remix-run/react";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: stylesheet }
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
