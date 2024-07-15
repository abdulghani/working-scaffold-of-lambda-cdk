import { ActionError } from "@/lib/action-error";
import { serverOnly$ } from "vite-env-only/macros";
import webpush from "web-push";
import { dbconn } from "./db";

webpush.setVapidDetails(
  "mailto:info@pranaga.com",
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export const getVAPIDKey = serverOnly$(function () {
  return process.env.VAPID_PUBLIC_KEY;
});

export const saveSubscription = serverOnly$(async function (
  userId: string,
  subscription: any
) {
  const entry = await dbconn?.("user_pos").where({ user_id: userId }).first();

  if (!entry) {
    throw new ActionError({
      message: "User not found",
      status: 404
    });
  }

  await dbconn?.("user_pos")
    .where({ user_id: userId })
    .update({
      subscription: JSON.stringify(subscription)
    });

  await webpush.sendNotification(
    subscription,
    JSON.stringify({
      title: "Hello, World!",
      description: "This is a test notification",
      path: "/admin"
    })
  );
});

export const sendNewOrderNotification = serverOnly$(async function (
  posId: string
) {
  const entries = await dbconn?.("user_pos").where({ pos_id: posId });

  await Promise.all(
    entries?.map?.(async (entry) => {
      const subscription = entry.subscription;

      if (subscription) {
        try {
          await webpush.sendNotification(
            subscription,
            JSON.stringify({
              title: "Pesanan baru",
              description: "Ada pesanan baru",
              path: "/admin"
            })
          );
        } catch (err) {
          console.log("FAILED SENDING PUSH ", err);
        }
      }
    }) || []
  );
});

export const getSubscription = serverOnly$(async function (userId: string) {
  const entry = await dbconn?.("user_pos").where({ user_id: userId }).first();

  return !!entry?.subscription;
});
