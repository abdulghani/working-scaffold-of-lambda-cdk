import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.raw(`/* SQL */
    CREATE TABLE "queue" (
      "id" text NOT NULL,
      "pos_id" text NOT NULL,
      "name" text NOT NULL,
      "pax" integer NOT NULL,
      "created_at" timestamptz,
      "phone" text,
      "updated_at" timestamptz DEFAULT now() NOT NULL,
      "temp_count" integer DEFAULT '0' NOT NULL,
      "status" text DEFAULT 'PENDING' NOT NULL,
      "notes" text,
      CONSTRAINT "queue_id" PRIMARY KEY ("id")
    ) WITH (oids = false);

    CREATE INDEX "queue_created_at" ON "queue" USING btree ("created_at");
    CREATE INDEX "queue_phone" ON "queue" USING btree ("phone");
    CREATE INDEX "queue_status" ON "queue" USING btree ("status");
    CREATE INDEX "queue_temp_count" ON "queue" USING btree ("temp_count" DESC);
    CREATE INDEX "queue_tenant_id" ON "queue" USING btree ("pos_id");
    CREATE INDEX "queue_updated_at" ON "queue" USING btree ("updated_at" DESC);

    CREATE TABLE "queue_daily_count" (
      "pos_id" text NOT NULL,
      "count" integer DEFAULT '0' NOT NULL,
      "updated_at" timestamptz DEFAULT now() NOT NULL
    ) WITH (oids = false);
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.raw(`/* SQL */
    DROP TABLE "queue";
    DROP TABLE "queue_daily_count";
  `);
}
