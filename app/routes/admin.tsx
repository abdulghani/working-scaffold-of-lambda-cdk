import { Outlet } from "@remix-run/react";

export default function Admin() {
  return (
    <>
      <div>admin page</div>
      <Outlet />
    </>
  );
}
