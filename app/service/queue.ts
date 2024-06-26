import { createCookie } from "@remix-run/node";
import { dbconn } from "./db";
import { serverOnly$ } from "vite-env-only/macros";
import { ulid } from "ulid";
import { startCase } from "lodash-es";
import moment from "moment";

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
    .where({ pos_id: posId, is_acknowledged: false, is_cancelled: false })
    .orderBy("created_at", "asc");

  return list;
});

export const getQueue = serverOnly$(async (queueId: string | undefined) => {
  if (!queueId) return null;
  return await dbconn?.("queue").where({ id: queueId }).first();
});

export const addQueue = serverOnly$(
  async ({ posId, name, pax, phone }: any) => {
    const count = await dbconn?.("queue_daily_count")
      .where({ pos_id: posId })
      .first();
    const currentCount = (() => {
      if (!count) {
        return 1;
      }
      if (moment(count.updated_at).isBefore(moment().startOf("day"))) {
        return 1;
      }
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
    .update({ is_cancelled: true })
    .returning("*");

  return queue?.find(Boolean);
});
