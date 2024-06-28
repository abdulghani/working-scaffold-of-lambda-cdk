import { serverOnly$ } from "vite-env-only/macros";
import { dbconn } from "./db";

export const getUserByEmail = serverOnly$(async (email: string) => {
  return dbconn?.("users").where({ email, is_disabled: false }).first();
});
