import { ActionError } from "@/lib/action-error";
import { parseZodIssue } from "@/lib/parse-zod-issue";
import { createCookie } from "@remix-run/node";
import { OrderDraftShape } from "app/routes/menu.$posId/order-draft-reducer";
import { parseInstanceId } from "app/routes/menu.$posId/order-helper";
import { ulid } from "ulid";
import { serverOnly$ } from "vite-env-only/macros";
import { z } from "zod";
import { dbconn } from "./db";
import { orderGetMenu } from "./menu";

const ORDER_INSTANCE_SCHEMA = z.object({
  menu_id: z.string().trim(),
  addon_ids: z.array(z.string().trim()).optional(),
  qty: z.number().int().positive().min(1, "Minimal 1 kuantitas").default(1),
  notes: z.string().trim().optional()
});

export const ORDER_SCHEMA = z.object({
  pos_id: z.string().trim().min(3),
  name: z
    .string()
    .trim()
    .min(3, "Minimal 3 karakter")
    .max(200, "Maksimal 200 karakter"),
  phone: z.string().trim().optional(),
  instance_record_json: z
    .record(z.string(), ORDER_INSTANCE_SCHEMA)
    .refine(
      (i) => Object.keys(i).length > 0,
      "Order must have at least one item"
    ),
  status: z
    .enum([
      "PENDING",
      "ACCEPTED",
      "COMPLETED",
      "CANCELLED",
      "CANCELLED_BY_USER"
    ])
    .default("PENDING")
});

export type OrderInstance = z.infer<typeof ORDER_INSTANCE_SCHEMA>;
export type Order = z.infer<typeof ORDER_SCHEMA>;

const COOKIE_SECRET = process.env.COOKIE_SECRET || "default";
export const orderCookie = createCookie("order", {
  httpOnly: true,
  path: "/",
  sameSite: "lax",
  secrets: [COOKIE_SECRET],
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 60 * 24 * 7 // 7 days
});

export const createOrder = serverOnly$(async function (
  orderDraft: OrderDraftShape
) {
  const { pos_id, instance_record_json } = orderDraft;

  const parsed = ORDER_SCHEMA.safeParse(orderDraft);

  if (!parsed.success && parsed.error) {
    throw new ActionError({
      message: "Validation error",
      status: 400,
      details: parseZodIssue(parsed.error.issues)
    });
  }

  const menuIds = Object.keys(instance_record_json).map(
    (key) => parseInstanceId(key).menuId
  );
  const menus = await orderGetMenu?.(menuIds);

  const count = await dbconn?.("order_count").where({ pos_id }).first();
  const orderCount = (Number(count?.count) || 0) + 1;

  const transaction = await dbconn?.transaction();
  const result = await transaction?.("order")
    .insert({
      id: ulid(),
      pos_id: parsed.data.pos_id,
      name: parsed.data.name,
      phone: parsed.data.phone,
      instance_record_json: JSON.stringify(parsed.data.instance_record_json),
      status: parsed.data.status,
      menu_snapshot: JSON.stringify(menus),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      temp_count: orderCount
    })
    .returning("*");

  if (count) {
    await transaction?.("order_count").where({ pos_id }).update({
      count: orderCount,
      updated_at: new Date().toISOString()
    });
  } else {
    await transaction?.("order_count").where({ pos_id }).insert({
      pos_id,
      count: orderCount,
      updated_at: new Date().toISOString()
    });
  }

  await transaction?.commit();

  return result?.find(Boolean);
});

export const getOrder = serverOnly$(async function (orderId?: string) {
  if (!orderId) {
    return null;
  }

  const result = await dbconn?.("order")
    .select("*")
    .where({ id: orderId })
    .first();

  if (!result) {
    throw new ActionError({
      message: "Order not found",
      status: 404,
      headers: {
        "Set-Cookie": await orderCookie.serialize("", { maxAge: 0 })
      }
    });
  }

  return result;
});
