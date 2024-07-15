import { wrapActionError } from "@/lib/action-error";
import { ActionFunctionArgs } from "@remix-run/node";
import { verifySession } from "app/service/auth";
import { saveSubscription } from "app/service/push";

export const action = wrapActionError(async function ({
  request
}: ActionFunctionArgs) {
  const userId = await verifySession?.(request);
  const payload = await request.json();
  await saveSubscription?.(userId, payload);

  return {};
});
