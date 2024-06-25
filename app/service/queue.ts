import { createCookie } from "@remix-run/node";
import { dbconn } from "./db";
import { serverOnly$ } from "vite-env-only/macros";
import { ulid } from "ulid";

const COOKIE_NAME = "queue";
const COOKIE_SECRET = process.env.COOKIES_SECRET || "default";

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

export const addQueue = serverOnly$(
  async ({ posId, name, pax, phone }: any) => {
    const queue = await dbconn?.("queue")
      .insert({
        id: ulid(),
        pos_id: posId,
        name: name,
        pax: pax,
        phone: phone,
        created_at: new Date().toISOString(),
        is_acknowledged: false,
        is_cancelled: false
      })
      .returning("*");

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
