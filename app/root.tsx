import { CardDescription, CardTitle } from "@/components/ui/card";
import { LinksFunction } from "@remix-run/node";
import { Links, Meta, Outlet, Scripts, useRouteError } from "@remix-run/react";
import stylesheet from "./style.css?url";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: stylesheet },
  { rel: "icon", href: "/react.svg" }
];

export function ErrorBoundary() {
  const error = useRouteError() as Error;

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
      <body className="bg-background font-sans antialiased">
        <div className="flex min-h-svh w-full flex-col items-center justify-center px-6">
          <CardTitle className="-mt-14 text-lg">Something went wrong</CardTitle>
          <CardDescription className="text-center">
            {error.message}
          </CardDescription>
        </div>
        <Scripts />
      </body>
    </html>
  );
}

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
      <body className="bg-background font-sans antialiased">
        <Outlet />
        <Scripts />
      </body>
    </html>
  );
}
