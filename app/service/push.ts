import { INTERNAL_API_HOST, INTERNAL_API_KEY } from "@/constants/internal-api";
import { ActionError } from "@/lib/action-error";
import { padNumber } from "@/lib/pad-number";
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

export const invokeNewOrderNotification = serverOnly$(async function (options: {
  pos_id: string;
  temp_count: number;
  name: string;
}) {
  if (!INTERNAL_API_HOST || !INTERNAL_API_KEY) {
    return;
  }

  await fetch(`${INTERNAL_API_HOST}/api/notification`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": INTERNAL_API_KEY
    },
    body: JSON.stringify({ ...options, _action: "NEW_ORDER" })
  });
});

export const sendNewOrderNotification = serverOnly$(async function (options: {
  pos_id: string;
  temp_count: number;
  name: string;
}) {
  const { pos_id, temp_count, name } = options;
  const entries = await dbconn?.("user_pos").where({ pos_id });
  if (!entries?.length) {
    return;
  }
  const sessions = await dbconn?.("session")
    .whereIn(
      "user_id",
      entries.map((entry) => entry.user_id)
    )
    .andWhere("expires_at", ">", new Date().toISOString());
  const filteredEntries = entries.filter((entry) => {
    return (sessions || []).find(
      (session) => session.user_id === entry.user_id
    );
  });

  await Promise.all(
    filteredEntries?.map?.(async (entry) => {
      const subscription = entry.subscription;

      if (subscription) {
        try {
          await webpush.sendNotification(
            subscription,
            JSON.stringify({
              title: "Pesanan baru",
              description: `Pesanan #${padNumber(temp_count)} dari ${name}`,
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

  return entry?.subscription?.keys?.p256dh;
});
