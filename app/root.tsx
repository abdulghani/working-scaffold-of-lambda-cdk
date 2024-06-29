import { CardDescription, CardTitle } from "@/components/ui/card";
import { ActionError } from "@/lib/action-error";
import { initializeLocale } from "@/lib/date";
import { LinksFunction } from "@remix-run/node";
import { Links, Meta, Outlet, Scripts, useRouteError } from "@remix-run/react";
import favicon from "../public/react.svg?url";
import stylesheet from "./style.css?url";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: stylesheet },
  { rel: "icon", href: favicon }
];

export function ErrorBoundary() {
  const error = useRouteError() as any;

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
          {error instanceof ActionError ? (
            <>
              <CardTitle className="-mt-14 text-lg">
                {error.message || "Terjadi kesalahan"}
              </CardTitle>
              <CardDescription className="text-center">
                {error.description || "Silahkan coba lagi nanti"}
              </CardDescription>
            </>
          ) : (
            <>
              <CardTitle className="-mt-14 text-lg">
                {error.message || "Terjadi kesalahan"}
              </CardTitle>
              <CardDescription className="text-center">
                {error.description || "Silahkan coba lagi nanti"}
              </CardDescription>
            </>
          )}
        </div>
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  initializeLocale();
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
