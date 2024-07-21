import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.raw(`/* SQL */
    CREATE TABLE "user" (
        "id" text NOT NULL,
        "email" text NOT NULL,
        "name" text,
        "profile_img" text,
        "created_at" timestamptz DEFAULT now() NOT NULL,
        "updated_at" timestamptz DEFAULT now() NOT NULL,
        "hashed_pin" text,
        "username" text,
        "is_disabled" boolean DEFAULT false NOT NULL,
        "notification_settings" jsonb,
        CONSTRAINT "user_email" UNIQUE ("email"),
        CONSTRAINT "user_user_id" PRIMARY KEY ("id"),
        CONSTRAINT "user_username" UNIQUE ("username")
    ) WITH (oids = false);
    `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.raw(`/* SQL */
    DROP TABLE "user";
    `);
}
