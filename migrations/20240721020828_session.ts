import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.raw(`/* SQL */
    CREATE TABLE "session" (
      "user_id" text NOT NULL,
      "session_id" text NOT NULL,
      "created_at" timestamptz DEFAULT now() NOT NULL,
      "expires_at" timestamptz DEFAULT now() NOT NULL,
      "notification_subscription" jsonb,
      CONSTRAINT "session_user_id_session_id" UNIQUE ("user_id", "session_id")
    ) WITH (oids = false);

    CREATE INDEX "session_session_id" ON "session" USING btree ("session_id");
    CREATE INDEX "session_user_id" ON "session" USING btree ("user_id");

    CREATE TABLE "otp_code" (
      "user_id" text NOT NULL,
      "otp_code" text NOT NULL,
      "is_completed" boolean DEFAULT false NOT NULL,
      "updated_at" timestamptz DEFAULT now() NOT NULL,
      CONSTRAINT "otp_code_user_id" UNIQUE ("user_id")
    ) WITH (oids = false);
    `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.raw(`/* SQL */
    DROP TABLE "session";
    DROP TABLE "otp_code";
  `);
}
