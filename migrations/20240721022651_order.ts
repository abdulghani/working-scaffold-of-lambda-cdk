import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.raw(`/* SQL */
    CREATE TABLE "order" (
      "id" text NOT NULL,
      "pos_id" text NOT NULL,
      "instance_record_json" jsonb NOT NULL,
      "created_at" timestamptz DEFAULT now() NOT NULL,
      "updated_at" timestamptz DEFAULT now() NOT NULL,
      "status" text DEFAULT 'PENDING' NOT NULL,
      "menu_snapshot" jsonb NOT NULL,
      "name" text NOT NULL,
      "phone" text,
      "temp_count" integer DEFAULT '0',
      "tax_snapshot" jsonb,
      "notes" text,
      "payment_proof" text,
      CONSTRAINT "order_id" PRIMARY KEY ("id")
    ) WITH (oids = false);

    CREATE INDEX "order_pos_id" ON "order" USING btree ("pos_id");
    CREATE INDEX "order_status" ON "order" USING btree ("status");
    CREATE INDEX "order_temp_count" ON "order" USING btree ("temp_count" DESC);
    CREATE INDEX "order_updated_at" ON "order" USING btree ("updated_at" DESC);
    COMMENT ON COLUMN "order"."instance_record_json" IS 'denormalize here';
    COMMENT ON COLUMN "order"."status" IS 'pending, accepted, completed, or cancelled';

    CREATE TABLE "order_count" (
      "pos_id" text NOT NULL,
      "count" integer DEFAULT '0' NOT NULL,
      "updated_at" timestamptz DEFAULT now() NOT NULL
    ) WITH (oids = false);
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.raw(`/* SQL */
    DROP TABLE "order";
    DROP TABLE "order_count";
  `);
}
