import { ActionFunctionArgs, json } from "@remix-run/node";
import { cleanupSession } from "app/service/auth";
import { incrementSold } from "app/service/order";
import {
  sendAdhocNotification,
  sendNewOrderNotification,
  sendNewQueueNotification,
  sendOrderCancelledNotification,
  sendQueueCancelledNotification
} from "app/service/push";

function validateRequestAPIKey(request: Request) {
  const apiKey = request.headers.get("x-api-key");
  if (!apiKey || apiKey !== process.env.INTERNAL_API_KEY) {
    throw json({ error: "Unauthorized" }, { status: 401 });
  }
}

export const INTERNAL_EVENT = {
  NOTIFICATION_ORDER_NEW: "NOTIFICATION_ORDER_NEW",
  NOTIFICATION_ORDER_CANCELLED: "NOTIFICATION_ORDER_CANCELLED",
  NOTIFICATION_QUEUE_NEW: "NOTIFICATION_QUEUE_NEW",
  NOTIFICATION_QUEUE_CANCELLED: "NOTIFICATION_QUEUE_CANCELLED",
  NOTIFICATION_ADHOC: "NOTIFICATION_ADHOC",
  MENU_INCREMENT_SOLD: "MENU_INCREMENT_SOLD",
  CLEANUP_SESSION: "CLEANUP_SESSION"
} as const;

export async function action({ request }: ActionFunctionArgs) {
  validateRequestAPIKey(request);
  const payload = await request.json();
  const instances = Array.isArray(payload) ? payload : [payload];

  await Promise.all(
    instances.map(async (instance) => {
      try {
        switch (instance._action) {
          case INTERNAL_EVENT.NOTIFICATION_QUEUE_CANCELLED: {
            await sendQueueCancelledNotification?.(instance);
            break;
          }
          case INTERNAL_EVENT.NOTIFICATION_ORDER_CANCELLED: {
            await sendOrderCancelledNotification?.(instance);
            break;
          }
          case INTERNAL_EVENT.NOTIFICATION_ADHOC: {
            await sendAdhocNotification?.(instance);
            break;
          }
          case INTERNAL_EVENT.NOTIFICATION_QUEUE_NEW: {
            await sendNewQueueNotification?.(instance);
            break;
          }
          case INTERNAL_EVENT.NOTIFICATION_ORDER_NEW: {
            await sendNewOrderNotification?.(instance);
            break;
          }
          case INTERNAL_EVENT.MENU_INCREMENT_SOLD: {
            await incrementSold?.(instance);
            break;
          }
          case INTERNAL_EVENT.CLEANUP_SESSION: {
            await cleanupSession?.();
            break;
          }
          default: {
            break;
          }
        }
      } catch (err) {
        console.log("FAILED INTERNAL ACTION", instance, err);
      }
    })
  );

  return {};
}
