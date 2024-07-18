import { redirect } from "@remix-run/node";
import { LRUCache } from "lru-cache";
import { serverOnly$ } from "vite-env-only/macros";
import { z } from "zod";
import { dbconn } from "./db";

const POS_CACHE = new LRUCache({
  ttl: 1000 * 60 * 60 * 24, // 1 day
  ttlAutopurge: true
});

export const POS_SCHEMA = z.object({
  id: z.string(),
  tenant_id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  profile_img: z.string().optional(),
  created_at: z.string(),
  updated_at: z.string(),
  base_payment_qr: z.string().optional()
});

export type POS = z.infer<typeof POS_SCHEMA>;

export const validatePOSId = serverOnly$(async (posId: string) => {
  let pos = POS_CACHE.get(posId);
  if (pos) {
    return pos;
  }

  pos = await dbconn?.("pos").where({ id: posId }).first();
  if (pos) {
    POS_CACHE.set(posId, pos);
    return pos;
  }

  throw redirect("/404");
});

export const getPOSTax = serverOnly$(async function (posId: string) {
  const tax = await dbconn?.("pos_tax").where({ pos_id: posId }).first();

  return tax;
});
