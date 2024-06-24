import { createCookie } from "@remix-run/node";

const COOKIE_NAME = "queue";
const COOKIE_SECRET = process.env.COOKIES_SECRET || "default";

export const queueCookie = createCookie(COOKIE_NAME, {
  httpOnly: true,
  path: "/",
  sameSite: "lax",
  secrets: [COOKIE_SECRET],
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 60 * 4 // 4 hours
});
