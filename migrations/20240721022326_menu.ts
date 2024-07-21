import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.raw(`/* SQL */
    CREATE TABLE "menu" (
      "pos_id" text NOT NULL,
      "title" text NOT NULL,
      "description" text,
      "imgs" jsonb,
      "categories" jsonb,
      "price" numeric DEFAULT '0' NOT NULL,
      "active" boolean DEFAULT true NOT NULL,
      "created_at" timestamptz DEFAULT now() NOT NULL,
      "updated_at" timestamptz DEFAULT now() NOT NULL,
      "id" text NOT NULL,
      "sold_count" integer DEFAULT '0' NOT NULL,
      CONSTRAINT "menu_id" PRIMARY KEY ("id")
    ) WITH (oids = false);

    CREATE INDEX "menu_pos_id" ON "menu" USING btree ("pos_id");
    CREATE INDEX "menu_sold_count" ON "menu" USING btree ("sold_count" DESC);
    COMMENT ON COLUMN "menu"."imgs" IS 'array of images';
    COMMENT ON COLUMN "menu"."categories" IS 'array of categories';

    CREATE TABLE "menu_category" (
      "id" text NOT NULL,
      "pos_id" text NOT NULL,
      "title" text,
      "description" text,
      "created_at" timestamptz DEFAULT now() NOT NULL,
      "updated_at" timestamptz DEFAULT now(),
      "active" boolean DEFAULT true NOT NULL,
      CONSTRAINT "menu_category_id" PRIMARY KEY ("id")
    ) WITH (oids = false);
    CREATE INDEX "menu_category_pos_id" ON "menu_category" USING btree ("pos_id");

    CREATE TABLE "addon" (
      "id" text NOT NULL,
      "pos_id" text NOT NULL,
      "addon_group_id" text,
      "title" text,
      "description" text,
      "img" text,
      "price" numeric DEFAULT '0' NOT NULL,
      "created_at" timestamptz DEFAULT now() NOT NULL,
      "updated_at" timestamptz DEFAULT now(),
      "active" boolean DEFAULT true NOT NULL,
      CONSTRAINT "addons_id" PRIMARY KEY ("id")
    ) WITH (oids = false);

    CREATE INDEX "addons_addon_group_id" ON "addon" USING btree ("addon_group_id");
    CREATE INDEX "addons_pos_id" ON "addon" USING btree ("pos_id");

    CREATE TABLE "addon_group" (
      "id" text NOT NULL,
      "pos_id" text NOT NULL,
      "title" text,
      "description" text,
      "img" text,
      "created_at" timestamptz DEFAULT now() NOT NULL,
      "updated_at" timestamptz DEFAULT now(),
      "active" boolean DEFAULT true NOT NULL,
      "required" boolean DEFAULT false NOT NULL,
      "menu_id" text NOT NULL,
      "multiple_select" boolean DEFAULT false NOT NULL,
      "default_addon_id" text,
      CONSTRAINT "addon_group_id" PRIMARY KEY ("id")
    ) WITH (oids = false);

    CREATE INDEX "addon_group_menu_id" ON "addon_group" USING btree ("menu_id");
    CREATE INDEX "addon_group_pos_id" ON "addon_group" USING btree ("pos_id");
    COMMENT ON COLUMN "addon_group"."multiple_select" IS 'choose only one or multiple select';
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.raw(`/* SQL */
    DROP TABLE "menu";
    DROP TABLE "menu_category";
    DROP TABLE "addon";
    DROP TABLE "addon_group";
  `);
}
