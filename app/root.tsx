import { CardDescription, CardTitle } from "@/components/ui/card";
import { Toaster } from "@/components/ui/sonner";
import { initializeLocale } from "@/lib/date";
import { LinksFunction } from "@remix-run/node";
import { Links, Meta, Outlet, Scripts, useRouteError } from "@remix-run/react";
import { CircleCheck, CircleX } from "lucide-react";
import stylesheet from "./style.css?url";

initializeLocale();
export const links: LinksFunction = () => [
  { rel: "stylesheet", href: stylesheet },
  { rel: "icon", href: "/pranaga-logo-light.jpg" }
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
          <CardTitle className="-mt-14 text-lg">
            {error.data?.error?.message || "Terjadi kesalahan"}
          </CardTitle>
          <CardDescription className="text-center">
            {error.data?.error?.description || "Silahkan coba lagi nanti"}
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
        <Toaster
          position="bottom-right"
          expand={false}
          icons={{
            success: <CircleCheck className="mr-1.5 h-4 w-4 text-green-500" />,
            error: <CircleX className="mr-1.5 h-4 w-4 text-red-500" />
          }}
        />
        <Scripts />
      </body>
    </html>
  );
}
