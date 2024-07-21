import dotenv from "dotenv";
import path from "path";
import { envOnlyMacros } from "vite-env-only";
import { defineConfig } from "vitest/config";

const CURRENT_DIR = path.resolve(__filename.split("/").slice(0, -1).join("/"));
const IS_CI = process.env.CI?.toLowerCase() === "true";

function getConfirmedTestEnv() {
  // read env file on local env
  if (!IS_CI) {
    dotenv.config();
  }

  const isConfirmed =
    process.env.DB_PASSWORD !== process.env.TEST_DB_PASSWORD ||
    process.env.DB_HOST !== process.env.TEST_DB_HOST ||
    process.env.DB_PORT !== process.env.TEST_DB_PORT;

  if (!isConfirmed) {
    throw new Error("test db connection are identical");
  }

  return {
    IS_VITEST: "true",
    IS_VITEST_CONFIRMED: "true",
    IS_VITEST_ABSOLUTELY_CONFIRMED: "true",
    IS_VITEST_CONFIDENTLY_CONFIRMED: "true",
    DB_PASSWORD: process.env.TEST_DB_PASSWORD || "",
    DB_HOST: process.env.TEST_DB_HOST || "",
    DB_PORT: process.env.TEST_DB_PORT || "",
    DB_USER: process.env.TEST_DB_USER || "",
    DB_NAME: process.env.TEST_DB_NAME || ""
  };
}

export default defineConfig(({ command, mode }) => {
  return {
    plugins: [envOnlyMacros()],
    test: {
      fileParallelism: false,
      env: {
        NODE_ENV: "test",
        ...getConfirmedTestEnv()
      },
      silent: IS_CI ? true : false,
      testTimeout: 10_000, // 10 seconds
      teardownTimeout: 50_000, // 50 seconds
      globalSetup: [path.resolve(CURRENT_DIR, "./setup.ts")],
      sequence: {
        shuffle: {
          files: true,
          tests: false
        }
      }
    }
  };
});
