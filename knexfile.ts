import type { Knex } from "knex";

const config: { [key: string]: Knex.Config } = {
  test: {
    client: "pg",
    connection: {
      host: process.env.TEST_DB_HOST,
      port: Number(process.env.TEST_DB_PORT),
      user: process.env.TEST_DB_USER,
      password: process.env.TEST_DB_PASSWORD,
      database: process.env.TEST_DB_NAME
    },
    pool: {
      min: 1,
      max: 1
    },
    migrations: {
      directory: "./migrations",
      tableName: "_migration"
    }
  }
};

module.exports = config;
