import { ActionError } from "@/lib/action-error";
import { createCookie } from "@remix-run/node";
import { startCase } from "lodash-es";
import moment from "moment";
import { ulid } from "ulid";
import { serverOnly$ } from "vite-env-only/macros";
import { dbconn } from "./db";

const COOKIE_NAME = "queue";
const COOKIE_SECRET = process.env.COOKIE_SECRET || "default";

export const queueCookie = createCookie(COOKIE_NAME, {
  httpOnly: true,
  path: "/",
  sameSite: "lax",
  secrets: [COOKIE_SECRET],
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 60 * 4 // 4 hours
});

export const getQueueList = serverOnly$(async (posId: string) => {
  const list = await dbconn?.("queue")
    .where({
      pos_id: posId,
      is_acknowledged: false,
      is_cancelled: false,
      is_user_cancelled: false
    })
    .orderBy("created_at", "asc");

  return list;
});

export const getQueueListHistory = serverOnly$(async (posId: string) => {
  const list = await dbconn?.("queue")
    .where({ pos_id: posId, is_user_cancelled: false })
    .andWhere(
      "created_at",
      ">=",
      moment().startOf("day").subtract(2, "day").toISOString()
    )
    .andWhere((q) => {
      q.where("is_acknowledged", true).orWhere("is_cancelled", true);
    })
    .orderBy("created_at", "desc");

  return list;
});

export const getQueue = serverOnly$(async (queueId: string | undefined) => {
  if (!queueId) return null;
  return await dbconn?.("queue").where({ id: queueId }).first();
});

export const addQueue = serverOnly$(
  async ({ posId, name, pax, phone }: any) => {
    const validation: any = {};
    if (!name) {
      validation.name = "Nama harus diisi";
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
    } else if (phone && phone.length < 10) {
      validation.phone = "Minimal 10 digit";
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
        count.count > 10 &&
        moment(count.updated_at).isBefore(moment().startOf("day"))
      ) {
        return 1;
      }
      /** INCREMENT COUNT */
      return count.count + 1;
    })();

    /** INITIATE TRANSACTION */
    const trx = await dbconn?.transaction();
    const queue = await trx?.("queue")
      .insert({
        id: ulid(),
        pos_id: posId,
        name: startCase(name),
        pax: pax,
        phone: phone,
        created_at: new Date().toISOString(),
        is_acknowledged: false,
        is_cancelled: false,
        is_user_cancelled: false,
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

    return queue?.find(Boolean);
  }
);

export const cancelQueue = serverOnly$(async (queueId: string) => {
  const queue = await dbconn?.("queue")
    .where({ id: queueId })
    .update({ is_cancelled: true, updated_at: new Date().toISOString() })
    .returning("*");

  return queue?.find(Boolean);
});

export const userCancelQueue = serverOnly$(async (queueId: string) => {
  const queue = await dbconn?.("queue")
    .where({ id: queueId, is_acknowledged: false, is_cancelled: false })
    .update({ is_user_cancelled: true, updated_at: new Date().toISOString() })
    .returning("*");

  return queue?.find(Boolean);
});

export const acknowledgeQueue = serverOnly$(async (queueId: string) => {
  const queue = await dbconn?.("queue")
    .where({ id: queueId })
    .update({ is_acknowledged: true, updated_at: new Date().toISOString() })
    .returning("*");

  return queue?.find(Boolean);
});
