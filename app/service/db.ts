import knex from "knex";
import { serverOnly$ } from "vite-env-only/macros";

function isConfirmedTestEnv() {
  return (
    process.env.IS_VITEST === "true" &&
    process.env.IS_VITEST_CONFIRMED === "true" &&
    process.env.IS_VITEST_ABSOLUTELY_CONFIRMED === "true" &&
    process.env.IS_VITEST_CONFIDENTLY_CONFIRMED === "true"
  );
}

export const dbconn = serverOnly$(
  knex({
    client: "pg",
    connection: (() => {
      // only run on confirmed test env
      if (process.env.NODE_ENV === "test" && !isConfirmedTestEnv()) {
        return;
      }

      return {
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
      };
    })(),
    pool: {
      // optimize for lambda, reasonable limit for scale on concurrent connection
      // default is min: 2, max: 10 for knex pg
      min: 1,
      max: 3
    }
  })
);
