import { ActionError } from "@/lib/action-error";
import { calculateTax } from "@/lib/calculate-tax";
import { padNumber } from "@/lib/pad-number";
import { parseZodIssue } from "@/lib/parse-zod-issue";
import { ZOD_PHONE_TYPE } from "@/lib/zod-phone-type";
import { createCookie } from "@remix-run/node";
import { OrderDraftShape } from "app/routes/menu.$posId/order-draft-reducer";
import { parseInstanceId } from "app/routes/menu.$posId/order-helper";
import { startCase } from "lodash-es";
import { DateTime } from "luxon";
import { ulid } from "ulid";
import { serverOnly$ } from "vite-env-only/macros";
import { z } from "zod";
import { dbconn } from "./db";
import { orderGetMenu } from "./menu";
import { getPOSTax } from "./pos";
import { generateQRData } from "./qrcode";

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
    .max(200, "Maksimal 200 karakter")
    .transform((i) => startCase(i)),
  phone: ZOD_PHONE_TYPE,
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
    .default("PENDING"),
  notes: z.string().optional()
});

export const ORDER_STATUS_ENUM = {
  PENDING: "PENDING",
  ACCEPTED: "ACCEPTED",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
  CANCELLED_BY_USER: "CANCELLED_BY_USER"
};

export const ORDER_CANCELLABLE_STATUS = [
  "PENDING",
  "COMPLETED",
  "CANCELLED",
  "CANCELLED_BY_USER"
];
export const ORDER_END_STATUS = ["COMPLETED", "CANCELLED", "CANCELLED_BY_USER"];

export const ORDER_STATUS_LABEL_ID: { [key: string]: string } = {
  PENDING: "Menunggu",
  ACCEPTED: "Diterima",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
  CANCELLED_BY_USER: "Dibatalkan pelanggan"
};

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

export const ORDER_ERROR_CODE = {
  ORDER_NOT_CANCELLABLE: "ORDER_NOT_CANCELLABLE",
  INVALID_ORDER_STATUS: "INVALID_ORDER_STATUS"
};

export const createOrder = serverOnly$(async function (orderDraft: {
  pos_id: string;
  name: string;
  phone?: string;
  instance_record_json: OrderDraftShape;
}) {
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
  const taxSnapshot = await getPOSTax?.(pos_id);

  const count = await dbconn?.("order_count").where({ pos_id }).first();
  const orderCount = (() => {
    /** RESET 999 to 1 */
    if (count?.count && String(count?.count).length > 3) {
      return 1;
    }
    return (Number(count?.count) || 0) + 1;
  })();

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
      temp_count: orderCount,
      tax_snapshot: taxSnapshot ? JSON.stringify(taxSnapshot) : null
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

export const userCancelOrder = serverOnly$(async function (
  orderId: string,
  notes?: string
) {
  const order = await getOrder?.(orderId);

  if (!order || ORDER_END_STATUS.includes(order.status)) {
    return;
  }

  if (!ORDER_CANCELLABLE_STATUS.includes(order.status)) {
    throw new ActionError({
      message: "Order not cancellable",
      code: ORDER_ERROR_CODE.ORDER_NOT_CANCELLABLE,
      status: 400,
      details: {
        status: `Pesanan Anda dalam status (${ORDER_STATUS_LABEL_ID[order.status]})`
      }
    });
  }

  const result = await dbconn?.("order")
    .where({ id: orderId })
    .update({
      status: "CANCELLED_BY_USER",
      notes,
      updated_at: new Date().toISOString()
    })
    .returning("*");

  return result?.find(Boolean);
});

export const adminGetPendingOrders = serverOnly$(async function (
  posId: string
) {
  const result = await dbconn?.("order")
    .select("*")
    .where({ pos_id: posId, status: "PENDING" })
    .orderBy("created_at", "desc");

  return result;
});

export const adminGetAcceptedOrders = serverOnly$(async function (
  posId: string
) {
  const result = await dbconn?.("order")
    .where({ pos_id: posId, status: "ACCEPTED" })
    .andWhere(
      "updated_at",
      ">=",
      DateTime.now().startOf("day").minus({ day: 2 }).toISO()
    )
    .orderBy("updated_at", "desc");

  return result;
});

export const adminGetHistoryOrders = serverOnly$(async function (
  posId: string
) {
  const result = await dbconn?.("order")
    .whereNotIn("status", ["PENDING", "ACCEPTED"])
    .andWhere({ pos_id: posId })
    .andWhere(
      "updated_at",
      ">=",
      DateTime.now().startOf("day").minus({ day: 2 }).toISO()
    )
    .orderBy("temp_count", "desc");

  return result;
});

export const adminAcceptOrder = serverOnly$(async function (orderId: string) {
  const order = await dbconn?.("order").where({ id: orderId }).first();
  if (order?.status !== ORDER_STATUS_ENUM.PENDING) {
    throw new ActionError({
      message: "Order not pending",
      code: ORDER_ERROR_CODE.INVALID_ORDER_STATUS,
      status: 400,
      details: {
        status: `Pesanan #${padNumber(order?.temp_count)} dalam status (${ORDER_STATUS_LABEL_ID[order.status]})`
      }
    });
  }

  const result = await dbconn?.("order")
    .where({ id: orderId })
    .update({
      status: ORDER_STATUS_ENUM.ACCEPTED,
      updated_at: new Date().toISOString()
    })
    .returning("*");

  return result?.find(Boolean);
});

export const adminCancelOrder = serverOnly$(async function (
  orderId: string,
  notes?: string
) {
  const order = await dbconn?.("order").where({ id: orderId }).first();
  if (order?.status !== ORDER_STATUS_ENUM.PENDING) {
    throw new ActionError({
      message: "Order not pending",
      code: ORDER_ERROR_CODE.INVALID_ORDER_STATUS,
      status: 400,
      details: {
        status: `Pesanan #${padNumber(order?.temp_count)} dalam status (${ORDER_STATUS_LABEL_ID[order.status]})`
      }
    });
  }

  const result = await dbconn?.("order")
    .where({ id: orderId })
    .update({
      status: ORDER_STATUS_ENUM.CANCELLED,
      notes,
      updated_at: new Date().toISOString()
    })
    .returning("*");

  return result?.find(Boolean);
});

export const adminCompleteOrder = serverOnly$(async function (options: any) {
  const { order_id, payment_proof } = options;
  const order = await dbconn?.("order").where({ id: order_id }).first();
  if (ORDER_END_STATUS.includes(order?.status)) {
    throw new ActionError({
      message: "Order is already completed or cancelled",
      code: ORDER_ERROR_CODE.INVALID_ORDER_STATUS,
      status: 400,
      details: {
        status: `Pesanan #${padNumber(order?.temp_count)} dalam status (${ORDER_STATUS_LABEL_ID[order.status]})`
      }
    });
  }

  const result = await dbconn?.("order")
    .where({ id: order_id })
    .update({
      status: ORDER_STATUS_ENUM.COMPLETED,
      payment_proof,
      updated_at: new Date().toISOString()
    })
    .returning("*");

  return result?.find(Boolean);
});

export const generateOrderQrCode = serverOnly$(async function (
  orderId: string
) {
  const order = await dbconn?.("order").where({ id: orderId }).first();

  if (!order) {
    throw new ActionError({
      message: "Order not found",
      status: 404,
      details: {
        order_id: orderId
      }
    });
  }

  const pos = await dbconn?.("pos").where({ id: order.pos_id }).first();

  if (!pos?.base_payment_qr) {
    throw new ActionError({
      message: "POS does not have qr code",
      status: 400,
      details: {
        pos_id: order.pos_id
      }
    });
  }

  const subTotal = Object.values(order.instance_record_json).reduce((t, i) => {
    const menu = order.menu_snapshot[i.menu_id];
    const addonMap = Object.fromEntries(
      menu.addon_groups
        ?.flatMap((g) => g?.addons || [])
        ?.map((a) => [a.id, a]) || []
    );
    const itemPrice =
      i.addon_ids?.reduce(
        (ta, a) => {
          return ta + (Number(addonMap?.[a]?.price) || 0);
        },
        Number(menu.price) || 0
      ) ||
      Number(menu.price) ||
      0;
    const itemTotal = itemPrice * (Number(i.qty) || 1);
    return t + itemTotal;
  }, 0) as number;

  const total = (() => {
    if (!order.tax_snapshot?.value) {
      return subTotal;
    }
    const taxAmount = calculateTax(subTotal, order.tax_snapshot?.value);
    return subTotal + taxAmount;
  })();

  return generateQRData?.({
    ...pos,
    amount: String(total),
    order_number: padNumber(order.temp_count),
    customer_name: order.name
  });
});
