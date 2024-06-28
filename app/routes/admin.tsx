import { LoaderFunctionArgs } from "@remix-run/node";
import { Outlet } from "@remix-run/react";
import { verifySession } from "app/service/auth";

export async function loader({ request }: LoaderFunctionArgs) {
  await verifySession?.(request);

  return {};
}

export default function Admin() {
  return (
    <>
      <div>admin page</div>
      <Outlet />
    </>
  );
}
