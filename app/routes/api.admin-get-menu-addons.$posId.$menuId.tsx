import { LoaderFunctionArgs } from "@remix-run/node";
import { verifySessionPOSAccess } from "app/service/auth";
import { getAdminMenuAddons } from "app/service/menu";

export async function loader({ params, request }: LoaderFunctionArgs) {
  await verifySessionPOSAccess?.(request, params.posId!);
  const addons = await getAdminMenuAddons?.(params);

  return addons;
}
