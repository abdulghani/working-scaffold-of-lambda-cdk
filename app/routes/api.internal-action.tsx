import { ActionFunctionArgs, json } from "@remix-run/node";
import { cleanupSession } from "app/service/auth";
import { incrementSold } from "app/service/order";
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
  const instances = Array.isArray(payload) ? payload : [payload];

  await Promise.all(
    instances.map(async (instance) => {
      switch (instance._action) {
        case "NOTIFICATION_NEW_ORDER": {
          await sendNewOrderNotification?.(instance);
          break;
        }
        case "MENU_INCREMENT_SOLD": {
          await incrementSold?.(instance);
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
    })
  );

  return {};
}
