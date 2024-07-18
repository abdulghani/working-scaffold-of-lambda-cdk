import { ActionFunctionArgs, json } from "@remix-run/node";
import { cleanupSession } from "app/service/auth";
import { sendNewOrderNotification } from "app/service/push";

function validateRequestAPIKey(request: Request) {
  const apiKey = request.headers.get("x-api-key");
  if (!apiKey || apiKey !== process.env.INTERNAL_API_KEY) {
    throw json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function action({ request }: ActionFunctionArgs) {
  validateRequestAPIKey(request);
  const payload = await request.json();

  switch (payload._action) {
    case "NEW_ORDER": {
      await sendNewOrderNotification?.(payload);
      break;
    }
    case "CLEANUP_SESSION": {
      await cleanupSession?.();
      break;
    }
    default: {
      break;
    }
  }

  return {};
}
