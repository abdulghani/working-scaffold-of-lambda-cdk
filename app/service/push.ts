import { ActionError } from "@/lib/action-error";
import { initializeVapid } from "@/lib/initialize-vapid";
import { padNumber } from "@/lib/pad-number";
import { serverOnly$ } from "vite-env-only/macros";
import webpush from "web-push";
import { dbconn } from "./db";

export const getVAPIDKey = serverOnly$(function () {
  return process.env.VAPID_PUBLIC_KEY;
});

export const SUBSCRIPTION_TOPIC = {
  ORDER_NEW: "ORDER_NEW",
  ORDER_CANCELLED: "ORDER_CANCELLED",
  QUEUE_NEW: "QUEUE_NEW",
  QUEUE_CANCELLED: "QUEUE_CANCELLED",
  NEW_VERSION: "NEW_VERSION",
  ORDER_CALL_WAITER: "ORDER_CALL_WAITER"
} as const;

export const SUBSCRIPTION_TOPIC_LABEL = {
  [SUBSCRIPTION_TOPIC.ORDER_NEW]: "Pesanan baru",
  [SUBSCRIPTION_TOPIC.ORDER_CANCELLED]: "Pesanan dibatalkan",
  [SUBSCRIPTION_TOPIC.QUEUE_NEW]: "Antrian baru",
  [SUBSCRIPTION_TOPIC.QUEUE_CANCELLED]: "Antrian dibatalkan",
  [SUBSCRIPTION_TOPIC.ORDER_CALL_WAITER]: "Panggil pelayan"
};

export const removeSubscription = serverOnly$(async function (
  sessionToken: string
) {
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
  const sessionEntry = await dbconn?.("session")
    .where({ user_id: userId, session_id: sessionToken })
    .first();

  if (!sessionEntry) {
    throw new ActionError({
      message: "User not found",
      status: 404
    });
  }

  const transaction = await dbconn?.transaction();
  await transaction?.("session")
    .where({ session_id: sessionToken })
    .update({
      notification_subscription: JSON.stringify(subscription)
    });
  await transaction?.commit();
  await sendNotification?.({
    title: "Notifikasi aktif",
    description: "Notifikasi berhasil diaktifkan",
    path: "/admin",
    subscription
  });
});

export const getUserSubscriptions = serverOnly$(async function (
  userId: string
) {
  const entries = await dbconn?.("session")
    .where({ user_id: userId })
    .whereNotNull("notification_subscription")
    .andWhere("expires_at", ">", new Date().toISOString());

  if (!entries?.length) {
    return;
  }

  return entries.map((entry) => entry.notification_subscription);
});

export const sendAdhocNotification = serverOnly$(async function (options: {
  userId: string;
  title: string;
  description: string;
  path?: string;
}) {
  const subscriptions = await getUserSubscriptions?.(options.userId);
  if (!subscriptions?.length) {
    return;
  }

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await sendNotification?.({
          title: options.title,
          description: options.description,
          path: options.path,
          subscription
        });
      } catch (err) {
        console.log("FAILED SENDING PUSH ", err);
      }
    })
  );
});

export const sendNotification = serverOnly$(async function (options: {
  title: string;
  description?: string;
  path?: string;
  subscription: any;
}) {
  try {
    initializeVapid();
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

export const getSessionNotification = serverOnly$(async function (options: {
  pos_id: string;
  topic?: keyof typeof SUBSCRIPTION_TOPIC;
}): Promise<any[] | undefined> {
  const { pos_id, topic } = options;
  const _entries = dbconn?.("user_pos");
  if (pos_id !== "_all") {
    _entries?.where({ pos_id });
  }
  const entries = await _entries;
  if (!entries?.length) {
    return;
  }
  const users = await dbconn?.("user")
    .whereIn(
      "id",
      entries.map((entry) => entry.user_id)
    )
    .whereNotNull("notification_settings");
  if (!users?.length) {
    return;
  }
  const filteredUsers = !topic
    ? users
    : users.filter((entry) => entry.notification_settings[topic]);
  if (!filteredUsers?.length) {
    return;
  }
  const sessions = await dbconn?.("session")
    .whereIn(
      "user_id",
      filteredUsers.map((entry) => entry.id)
    )
    .andWhere("expires_at", ">", new Date().toISOString())
    .whereNotNull("notification_subscription");
  if (!sessions?.length) {
    return;
  }

  return sessions;
});

export const sendWaiterNotification = serverOnly$(async function (options: {
  pos_id: string;
  table_number: string;
}) {
  const { pos_id, table_number } = options;
  const sessions = await getSessionNotification?.({
    pos_id
    // notify all user without topic subscription
  });

  if (!sessions?.length) {
    return;
  }

  await Promise.all(
    sessions.map(async (entry) => {
      const subscription = entry.notification_subscription;
      if (subscription) {
        await sendNotification?.({
          title: "Panggil pelayan",
          description: `Meja #${table_number} memanggil pelayan`,
          subscription
        });
      }
    })
  );
});

export const sendNewVersionNotification = serverOnly$(async function (options: {
  version: string;
  environment: string;
}) {
  const { version, environment } = options;
  const sessions = await getSessionNotification?.({
    pos_id: "_all",
    topic: SUBSCRIPTION_TOPIC.NEW_VERSION
  });
  if (!sessions?.length) {
    return;
  }

  await Promise.all(
    sessions.map(async (entry) => {
      const subscription = entry.notification_subscription;
      if (subscription) {
        await sendNotification?.({
          title: `Versi baru (${environment})`,
          description: `Versi baru telah tersedia (${version})`,
          subscription
        });
      }
    })
  );
});

export const sendOrderCancelledNotification = serverOnly$(
  async function (options: {
    pos_id: string;
    temp_count: number;
    name: string;
    order_id: string;
  }) {
    const { pos_id, temp_count, order_id } = options;
    const sessions = await getSessionNotification?.({
      pos_id,
      topic: SUBSCRIPTION_TOPIC.ORDER_CANCELLED
    });

    if (!sessions?.length) {
      return;
    }

    await Promise.all(
      sessions.map(async (entry) => {
        const subscription = entry.notification_subscription;
        if (subscription) {
          await sendNotification?.({
            title: "Pesanan dibatalkan",
            description: `Pesanan #${padNumber(temp_count)} dibatalkan pelanggan`,
            path: `/admin/${pos_id}/order?orderId=${order_id}`,
            subscription
          });
        }
      })
    );
  }
);

export const sendNewOrderNotification = serverOnly$(async function (options: {
  pos_id: string;
  temp_count: number;
  name: string;
  order_id: string;
}) {
  const { pos_id, temp_count, name, order_id } = options;
  const sessions = await getSessionNotification?.({
    pos_id,
    topic: SUBSCRIPTION_TOPIC.ORDER_NEW
  });

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
              path: `/admin/${pos_id}/order?orderId=${order_id}`
            })
          );
        } catch (err) {
          console.log("FAILED SENDING PUSH ", err);
        }
      }
    })
  );
});

export const sendQueueCancelledNotification = serverOnly$(
  async function (options: {
    pos_id: string;
    queue_id: string;
    temp_count: number;
  }) {
    const { pos_id, temp_count, queue_id } = options;
    const sessions = await getSessionNotification?.({
      pos_id,
      topic: SUBSCRIPTION_TOPIC.QUEUE_CANCELLED
    });

    if (!sessions?.length) {
      return;
    }

    await Promise.all(
      sessions.map(async (entry) => {
        const subscription = entry.notification_subscription;
        if (subscription) {
          await sendNotification?.({
            title: "Antrian dibatalkan",
            description: `Antrian #${padNumber(temp_count)} dibatalkan pelanggan`,
            path: `/admin/${pos_id}/queue?queueId=${queue_id}`,
            subscription
          });
        }
      })
    );
  }
);

export const sendNewQueueNotification = serverOnly$(async function (options: {
  pos_id: string;
  queue_id: string;
  temp_count: number;
  name: string;
  pax: number;
}) {
  const { pos_id, temp_count, name, queue_id, pax } = options;
  const sessions = await getSessionNotification?.({
    pos_id,
    topic: SUBSCRIPTION_TOPIC.QUEUE_NEW
  });

  if (!sessions?.length) {
    return;
  }

  await Promise.all(
    sessions.map(async (entry) => {
      const subscription = entry.notification_subscription;
      if (subscription) {
        await sendNotification?.({
          title: "Antrian baru",
          description: `Antrian #${padNumber(temp_count)} dari ${name} untuk ${pax} orang`,
          path: `/admin/${pos_id}/queue?queueId=${queue_id}`,
          subscription
        });
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

  if (!user) {
    return null;
  }

  return {
    subscriptionKey: entry?.notification_subscription?.keys?.p256dh,
    notificationSettings: user.notification_settings || {}
  };
});

export const subscribeTopic = serverOnly$(async function (options: {
  userId: string;
  topic: keyof typeof SUBSCRIPTION_TOPIC;
  value: boolean;
}) {
  const { userId, topic, value } = options;
  const user = await dbconn?.("user").where({ id: userId }).first();
  if (!user) {
    return;
  }
  const settings = user.notification_settings || {};
  settings[topic] = value;
  await dbconn?.("user")
    .where({ id: userId })
    .update({ notification_settings: JSON.stringify(settings) });

  await sendAdhocNotification?.({
    userId,
    title: `Notifikasi ${value ? "diaktifkan" : "dimatikan"}`,
    description: `Notifikasi ${SUBSCRIPTION_TOPIC_LABEL[topic]} ${value ? "diaktifkan" : "dimatikan"}`
  });
});
