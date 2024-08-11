import { LoaderFunctionArgs, redirect } from "@remix-run/node";
import { getSessionPOS } from "app/service/auth";

export async function loader({ request }: LoaderFunctionArgs) {
  const pos = await getSessionPOS?.(request);

  throw redirect(`/admin/${pos?.pos_id}/order`);
}
