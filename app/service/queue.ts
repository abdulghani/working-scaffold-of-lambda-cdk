import { ActionError } from "@/lib/action-error";
import { createCookie } from "@remix-run/node";
import { INTERNAL_EVENT } from "app/routes/api.internal-action";
import { startCase } from "lodash-es";
import { DateTime } from "luxon";
import { ulid } from "ulid";
import { serverOnly$ } from "vite-env-only/macros";
import { dbconn } from "./db";
import { invokeInternalAction } from "./internal-action";

const COOKIE_NAME = "queue";
const COOKIE_SECRET = process.env.COOKIE_SECRET || "default";

export const QUEUE_ENUM = {
  PENDING: "PENDING",
  ACKNOWLEDGED: "ACKNOWLEDGED",
  CANCELLED: "CANCELLED",
  USER_CANCELLED: "USER_CANCELLED"
};

export const QUEUE_ENUM_LABEL: any = {
  PENDING: "Menunggu",
  ACKNOWLEDGED: "Diterima",
  CANCELLED: "Ditolak",
  USER_CANCELLED: "Dibatalkan pelanggan"
};

export const queueCookie = createCookie(COOKIE_NAME, {
  httpOnly: true,
  path: "/",
  sameSite: "lax",
  secrets: [COOKIE_SECRET],
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 60 * 24 * 7 // 7 days
});

export const getQueueList = serverOnly$(async (posId: string) => {
  const list = await dbconn?.("queue")
    .where({
      pos_id: posId,
      status: QUEUE_ENUM.PENDING
    })
    .orderBy("created_at", "asc");

  return list;
});

export const getQueueListHistory = serverOnly$(async (posId: string) => {
  const list = await dbconn?.("queue")
    .whereNot("status", QUEUE_ENUM.PENDING)
    .andWhere({ pos_id: posId })
    .andWhere(
      "updated_at",
      ">=",
      DateTime.now().startOf("day").minus({ day: 2 }).toISO()
    )
    .orderBy("temp_count", "desc");

  return list;
});

export const getQueue = serverOnly$(
  async (queueId: string | undefined, posId: string | undefined) => {
    if (!queueId || !posId) return null;
    return await dbconn?.("queue")
      .where({ id: queueId, pos_id: posId })
      .first();
  }
);

export const addQueue = serverOnly$(
  async ({ posId, name, pax, phone }: any) => {
    const validation: any = {};
    if (!name) {
      validation.name = "Nama harus diisi";
    } else if (name.length < 3) {
      validation.name = "Nama minimal 2 karakter";
    } else if (name.length > 150) {
      validation.name = "Nama maksimal 150 karakter";
    }
    if (!pax) {
      validation.pax = "PAX minimal 1";
    } else if (Number(pax) > 100) {
      validation.pax = "PAX maksimal 100";
    }
    if (
      phone &&
      String(phone)
        .trim()
        .match(/[^\d|^+]+/i)
    ) {
      validation.phone = "Hanya boleh angka";
    } else if (phone && phone.length < 8) {
      validation.phone = "Minimal 8 angka";
    } else if (phone && phone.length > 50) {
      validation.phone = "Maksimal 50 angka";
    }
    if (Object.keys(validation).length) {
      throw new ActionError({
        message: "Validation error",
        status: 422,
        details: validation
      });
    }
    const count = await dbconn?.("queue_daily_count")
      .where({ pos_id: posId })
      .first();
    const currentCount = (() => {
      if (!count) {
        return 1;
      }
      /** RESET ON NEXT DAY WHEN COUNT EXCEED 10 */
      if (
        count.count >= 100 &&
        DateTime.fromISO(count.updated_at) < DateTime.now().startOf("day")
      ) {
        return 1;
      }
      /** INCREMENT COUNT */
      return count.count + 1;
    })();

    /** INITIATE TRANSACTION */
    const queueId = ulid();
    const trx = await dbconn?.transaction();
    const queue = await trx?.("queue")
      .insert({
        id: queueId,
        pos_id: posId,
        name: startCase(name),
        pax: pax,
        phone: phone,
        created_at: new Date().toISOString(),
        status: QUEUE_ENUM.PENDING,
        temp_count: currentCount
      })
      .returning("*");

    if (count) {
      await trx?.("queue_daily_count").where({ pos_id: posId }).update({
        pos_id: posId,
        count: currentCount,
        updated_at: new Date().toISOString()
      });
    } else {
      await trx?.("queue_daily_count").insert({
        pos_id: posId,
        count: currentCount,
        updated_at: new Date().toISOString()
      });
    }

    /** COMMIT TRANSACTION */
    await trx?.commit();

    /** INVOKE NOTIFICATION */
    invokeInternalAction?.({
      _action: INTERNAL_EVENT.NOTIFICATION_QUEUE_NEW,
      pos_id: posId,
      queue_id: queueId,
      temp_count: currentCount,
      name: startCase(name),
      pax: pax
    });

    return queue?.find(Boolean);
  }
);

export const cancelQueue = serverOnly$(
  async (queueId: string, notes?: string) => {
    const queue = await dbconn?.("queue")
      .where({ id: queueId })
      .update({
        status: QUEUE_ENUM.CANCELLED,
        notes: notes,
        updated_at: new Date().toISOString()
      })
      .returning("*");

    return queue?.find(Boolean);
  }
);

export const userCancelQueue = serverOnly$(
  async (queueId: string, notes?: string) => {
    const queues = await dbconn?.("queue")
      .whereNotIn("status", [QUEUE_ENUM.CANCELLED, QUEUE_ENUM.ACKNOWLEDGED])
      .andWhere({ id: queueId })
      .update({
        status: QUEUE_ENUM.USER_CANCELLED,
        notes: notes,
        updated_at: new Date().toISOString()
      })
      .returning("*");

    const queue = queues?.find(Boolean);

    if (!queue) {
      return;
    }

    invokeInternalAction?.({
      _action: INTERNAL_EVENT.NOTIFICATION_QUEUE_CANCELLED,
      queue_id: queueId,
      pos_id: queue.pos_id,
      temp_count: queue.temp_count
    });

    return queue;
  }
);

export const acknowledgeQueue = serverOnly$(async (queueId: string) => {
  const queue = await dbconn?.("queue")
    .where({ id: queueId })
    .update({
      status: QUEUE_ENUM.ACKNOWLEDGED,
      updated_at: new Date().toISOString()
    })
    .returning("*");

  return queue?.find(Boolean);
});
