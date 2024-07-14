import { wrapActionError } from "@/lib/action-error";
import { LoaderFunctionArgs } from "@remix-run/node";
import { verifySessionPOSAccess } from "app/service/auth";
import { adminPollOrder } from "app/service/order";

export const loader = wrapActionError(async function ({
  request,
  params
}: LoaderFunctionArgs) {
  await verifySessionPOSAccess?.(request, params.posId!);
  const orders = await adminPollOrder?.({
    posId: params.posId,
    currentTime: Buffer.from(params.currentTime || "", "base64").toString(
      "utf-8"
    )
  });

  return orders || [];
});
