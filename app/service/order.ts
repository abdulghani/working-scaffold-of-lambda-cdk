import { serverOnly$ } from "vite-env-only/macros";
import { z } from "zod";

const ORDER_INSTANCE_SCHEMA = z.record(
  z.string(),
  z.object({
    menu_id: z.string(),
    addon_ids: z.array(z.string()).optional(),
    qty: z.number().int().positive().default(1),
    notes: z.string().optional()
  })
);

export const ORDER_SCHEMA = z.object({
  id: z.string(),
  pos_id: z.string(),
  instance_record_json: ORDER_INSTANCE_SCHEMA,
  menu_snapshot: z.record(z.string(), z.any()).optional(),
  created_at: z.string(),
  updated_at: z.string(),
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

export const createOrder = serverOnly$(async function (options: {
  pos_id: string;
  menu_json: Partial<OrderInstance>[];
}) {
  const { pos_id, menu_json } = options;

  console.log("MENU PARSED");
});
