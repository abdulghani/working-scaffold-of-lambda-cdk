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

export const removeSubscription = serverOnly$(async function (
  sessionToken: string
) {
  const entry = await dbconn?.("session")
    .where({ session_id: sessionToken })
    .first();
  if (!entry) {
    return;
  }

  return await dbconn?.("session")
    .where({ session_id: sessionToken })
    .update({
      notification_subscription: null
    })
    .returning("*");
});

export const saveSubscription = serverOnly$(async function (options: {
  userId: string;
  sessionToken: string;
  subscription: any;
}) {
  const { userId, sessionToken, subscription } = options;
  const entry = await dbconn?.("user").where({ id: userId }).first();
  const sessionEntry = await dbconn?.("session")
    .where({ user_id: userId, session_id: sessionToken })
    .first();

  if (!entry || !sessionEntry) {
    throw new ActionError({
      message: "User not found",
      status: 404
    });
  }

  const transaction = await dbconn?.transaction();
  await transaction?.("user").where({ id: userId }).update({
    notification: true
  });
  await transaction?.("session")
    .where({ session_id: sessionToken })
    .update({
      notification_subscription: JSON.stringify(subscription)
    });
  await transaction?.commit();

  try {
    await webpush.sendNotification(
      subscription,
      JSON.stringify({
        title: "Notifikasi aktif",
        description: "Notifikasi berhasil diaktifkan",
        path: "/admin"
      })
    );
  } catch (err) {
    console.log("FAILED SENDING PUSH ", err);
  }
});

export const sendNotification = serverOnly$(async function (options: {
  title: string;
  description?: string;
  path?: string;
  subscription: any;
}) {
  try {
    await webpush.sendNotification(
      options.subscription,
      JSON.stringify({
        title: options.title,
        description: options.description,
        path: options.path
      })
    );
  } catch (err) {
    console.log("FAILED SENDING NOTIFICATION", err, options);
  }
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
  const users = await dbconn?.("user")
    .whereIn(
      "id",
      entries.map((entry) => entry.user_id)
    )
    .andWhere("notification", true);
  if (!users?.length) {
    return;
  }
  const sessions = await dbconn?.("session")
    .whereIn(
      "user_id",
      users.map((entry) => entry.id)
    )
    .andWhere("expires_at", ">", new Date().toISOString())
    .whereNotNull("notification_subscription");
  if (!sessions?.length) {
    return;
  }

  await Promise.all(
    sessions.map(async (entry) => {
      const subscription = entry.notification_subscription;

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
    })
  );
});

export const getSubscription = serverOnly$(async function (
  sessionToken: string
) {
  const entry = await dbconn?.("session")
    .where({ session_id: sessionToken })
    .first();
  if (!entry) {
    return null;
  }
  const user = await dbconn?.("user").where({ id: entry.user_id }).first();
  if (!user || !user.notification) {
    return null;
  }

  return entry?.notification_subscription?.keys?.p256dh;
});
