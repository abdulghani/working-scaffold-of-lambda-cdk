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
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1.0, user-scalable=no"
        />
        <Meta />
        <Links />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        <Outlet />
        <Scripts />
      </body>
    </html>
  );
}
