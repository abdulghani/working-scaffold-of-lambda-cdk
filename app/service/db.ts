import knex from "knex";
import { serverOnly$ } from "vite-env-only/macros";

export const dbconn = serverOnly$(
  knex({
    client: "pg",
    connection: {
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    }
  })
);
