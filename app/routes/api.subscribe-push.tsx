import { wrapActionError } from "@/lib/action-error";
import { ActionFunctionArgs } from "@remix-run/node";
import { sessionCookie, verifySession } from "app/service/auth";
import { saveSubscription } from "app/service/push";

export const action = wrapActionError(async function ({
  request
}: ActionFunctionArgs) {
  const userId = await verifySession?.(request);
  const sessionToken = await sessionCookie.parse(request.headers.get("Cookie"));
  const payload = await request.json();
  await saveSubscription?.({ userId, sessionToken, subscription: payload });

  return {};
});
