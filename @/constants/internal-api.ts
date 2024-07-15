import { serverOnly$ } from "vite-env-only/macros";

export const INTERNAL_API_HOST = serverOnly$(
  process.env.INTERNAL_API_HOST || ""
);
export const INTERNAL_API_KEY = serverOnly$(process.env.INTERNAL_API_KEY || "");
