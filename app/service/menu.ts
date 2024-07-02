import { serverOnly$ } from "vite-env-only/macros";
import { dbconn } from "./db";

export const getMenuByPOS = serverOnly$(async (posId: string) => {
  const list = await dbconn?.("menu")
    .where({ pos_id: posId, active: true })
    .select("*");

  return list;
});

export const getMenuCategoryPOS = serverOnly$(async (posId: string) => {
  const list = await dbconn?.("menu_category")
    .where({ pos_id: posId, active: true })
    .select("*");

  return list;
});

export const getAdminMenuByPOS = serverOnly$(async (posId: string) => {
  const list = await dbconn?.("menu").where({ pos_id: posId }).select("*");

  return list;
});
