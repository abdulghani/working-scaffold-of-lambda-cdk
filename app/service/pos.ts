import { redirect } from "@remix-run/node";
import { serverOnly$ } from "vite-env-only/macros";
import { dbconn } from "./db";

const POS_CACHE = new Map<string, any>();

export const validatePOSId = serverOnly$(async (posId: string) => {
  let pos = POS_CACHE.get(posId);
  if (pos) {
    return pos;
  }

  pos = await dbconn?.("pos").where({ pos_id: posId }).first();
  if (pos) {
    POS_CACHE.set(posId, pos);
    return pos;
  }

  throw redirect("/404");
});
