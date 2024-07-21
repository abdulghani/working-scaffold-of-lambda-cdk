import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.raw(`/* SQL */
    CREATE TABLE "pos" (
      "id" text NOT NULL,
      "tenant_id" text NOT NULL,
      "name" text,
      "description" text,
      "profile_img" text,
      "created_at" timestamptz DEFAULT now() NOT NULL,
      "updated_at" timestamptz DEFAULT now(),
      "updated_by" text,
      "base_payment_qr" text,
      CONSTRAINT "pos_pos_id" UNIQUE ("id"),
      CONSTRAINT "pos_pos_id_tenant_id" UNIQUE ("id", "tenant_id")
    ) WITH (oids = false);

    CREATE INDEX "pos_tenant_id" ON "pos" USING btree ("tenant_id");

    CREATE TABLE "pos_tax" (
      "pos_id" text NOT NULL,
      "value" numeric DEFAULT '0' NOT NULL,
      "behavior" text DEFAULT 'WHOLE' NOT NULL,
      "updated_at" timestamptz DEFAULT now() NOT NULL,
      CONSTRAINT "pos_tax_pos_id" PRIMARY KEY ("pos_id")
    ) WITH (oids = false);

    COMMENT ON COLUMN "pos_tax"."behavior" IS 'WHOLE, INDIVIDUAL, ETC';

    CREATE TABLE "public"."user_pos" (
      "user_id" text NOT NULL,
      "pos_id" text NOT NULL,
      "updated_at" timestamptz DEFAULT now() NOT NULL,
      CONSTRAINT "user_pos_user_id_pos_id" UNIQUE ("user_id", "pos_id")
    ) WITH (oids = false);

    CREATE INDEX "user_pos_pos_id" ON "public"."user_pos" USING btree ("pos_id");
    CREATE INDEX "user_pos_user_id" ON "public"."user_pos" USING btree ("user_id");
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.raw(`/* SQL */
    DROP TABLE "pos";
    DROP TABLE "pos_tax";
    DROP TABLE "user_pos";
  `);
}
