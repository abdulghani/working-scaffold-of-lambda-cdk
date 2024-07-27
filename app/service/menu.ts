import { serverOnly$ } from "vite-env-only/macros";
import { z } from "zod";
import { dbconn } from "./db";

const ADDON_SCHEMA = z.object({
  id: z.string(),
  pos_id: z.string(),
  addon_group_id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  img: z.string().optional(),
  price: z.number().positive(),
  active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string()
});

const ADDON_GROUP_SCHEMA = z.object({
  id: z.string(),
  pos_id: z.string(),
  menu_id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  img: z.string().optional(),
  active: z.boolean(),
  required: z.boolean(),
  multiple_select: z.boolean(),
  default_addon_id: z.string().optional(),
  created_at: z.string(),
  updated_at: z.string(),
  addons: z.array(ADDON_SCHEMA).optional()
});

const MENU_SCHEMA = z.object({
  id: z.string(),
  pos_id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  imgs: z.array(z.string()).optional(),
  categories: z.array(z.string()).optional(),
  price: z.number().positive(),
  active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
  addon_groups: z.array(ADDON_GROUP_SCHEMA).optional()
});

export type Menu = z.infer<typeof MENU_SCHEMA>;

export const getMenuByPOS = serverOnly$(
  async (posId: string): Promise<Menu[]> => {
    const list = await dbconn?.("menu")
      .select([
        "menu.*",
        dbconn?.raw(
          `NULLIF(json_agg(addon_group.*)::TEXT, '[null]')::JSONB as addon_groups`
        )
      ])
      .leftJoin(
        /** SUB QUERY IN LEFT JOIN */
        dbconn?.("addon_group")
          .select([
            "addon_group.*",
            dbconn.raw(
              "NULLIF(json_agg(addon.*)::TEXT, '[null]')::JSONB as addons"
            )
          ])
          .leftJoin(
            dbconn?.("addon")
              .select("*")
              .where({ "addon.pos_id": posId })
              .orderBy("addon.price", "desc")
              .as("addon"),
            "addon_group.id",
            "addon.addon_group_id"
          )
          .groupBy("addon_group.id")
          .orderBy("addon_group.required", "asc")
          .as("addon_group")
          .where({
            "addon_group.pos_id": posId,
            "addon_group.active": true,
            "addon.active": true
          }),
        "menu.id",
        "addon_group.menu_id"
      )
      .groupBy("menu.id")
      .where({ "menu.pos_id": posId, "menu.active": true })
      .orderBy("menu.sold_count", "desc");

    return list || [];
  }
);

export const getMenuCategoryPOS = serverOnly$(async (posId: string) => {
  const list = await dbconn?.("menu_category")
    .where({ pos_id: posId, active: true })
    .select("*");

  return list;
});

export const getAdminMenuByPOS = serverOnly$(
  async (posId: string): Promise<Menu[]> => {
    const list = await dbconn?.("menu")
      .select([
        "menu.*",
        dbconn?.raw(
          `NULLIF(json_agg(addon_group.*)::TEXT, '[null]')::JSONB as addon_groups`
        )
      ])
      .leftJoin(
        /** SUB QUERY IN LEFT JOIN */
        dbconn?.("addon_group")
          .select([
            "addon_group.*",
            dbconn.raw(
              "NULLIF(json_agg(addon.*)::TEXT, '[null]')::JSONB as addons"
            )
          ])
          .leftJoin(
            dbconn?.("addon")
              .select("*")
              .where({ "addon.pos_id": posId })
              .orderBy("addon.price", "desc")
              .as("addon"),
            "addon_group.id",
            "addon.addon_group_id"
          )
          .groupBy("addon_group.id")
          .orderBy("addon_group.required", "asc")
          .as("addon_group")
          .where({ "addon_group.pos_id": posId }),
        "menu.id",
        "addon_group.menu_id"
      )
      .groupBy("menu.id")
      .orderBy("menu.created_at", "asc")
      .where({ "menu.pos_id": posId });

    return list || [];
  }
);

export const getAdminMenuAddons = serverOnly$(
  async ({ menuId, posId }: any) => {
    /** GET BOTH ACTIVE/NON-ACTIVE */
    const group = await dbconn?.("addon_group")
      .select(["addon_group.*", dbconn.raw("json_agg(addon.*) as addons")])
      .leftJoin("addon", "addon_group.id", "addon.addon_group_id")
      .groupBy("addon_group.id")
      .where({ "addon_group.menu_id": menuId, "addon_group.pos_id": posId });

    return group;
  }
);

export const toggleMenuAddon = serverOnly$(
  async ({ addonId, value }: { addonId: string; value: boolean }) => {
    const update = await dbconn?.("addon")
      .where({ id: addonId })
      .update({ active: value });

    return update;
  }
);

export const toggleMenu = serverOnly$(
  async ({ menuId, value }: { menuId: string; value: boolean }) => {
    const update = await dbconn?.("menu")
      .where({ id: menuId })
      .update({ active: value })
      .returning("*");

    return update?.find(Boolean);
  }
);

export const orderGetMenu = serverOnly$(async (menuIds: string[]) => {
  const list = await dbconn?.("menu")
    .select([
      "menu.*",
      dbconn?.raw(
        `NULLIF(json_agg(addon_group.*)::TEXT, '[null]')::JSONB as addon_groups`
      )
    ])
    .leftJoin(
      /** SUB QUERY IN LEFT JOIN */
      dbconn?.("addon_group")
        .select([
          "addon_group.*",
          dbconn.raw(
            "NULLIF(json_agg(addon.*)::TEXT, '[null]')::JSONB as addons"
          )
        ])
        .leftJoin(
          dbconn?.("addon")
            .select("*")

            .orderBy("addon.price", "desc")
            .as("addon"),
          "addon_group.id",
          "addon.addon_group_id"
        )
        .groupBy("addon_group.id")
        .orderBy("addon_group.required", "asc")
        .as("addon_group")
        .whereIn("addon_group.menu_id", menuIds),
      "menu.id",
      "addon_group.menu_id"
    )
    .groupBy("menu.id")
    .whereIn("menu.id", menuIds);

  return Object.fromEntries((list || []).map((i) => [i.id, i]));
});
