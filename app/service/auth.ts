import { createCookie, redirect } from "@remix-run/node";

const COOKIE_NAME = "auth";
const COOKIE_SECRET = process.env.COOKIE_SECRET || "default";

export const authCookie = createCookie(COOKIE_NAME, {
  httpOnly: true,
  path: "/",
  sameSite: "lax",
  secrets: [COOKIE_SECRET],
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 60 * 24 * 3 // 3 days
});

export async function requireAuthCookie(request: Request) {
  const cookie = await authCookie.parse(request.headers.get("Cookie"));

  if (!cookie) {
    throw redirect("/login", {
      headers: {
        "Set-Cookie": await authCookie.serialize("", {
          maxAge: 0
        })
      }
    });
  }

  return cookie;
}

export async function redirectLoggedInUser(request: Request) {
  const cookie = await authCookie.parse(request.headers.get("Cookie"));

  if (cookie) {
    throw redirect("/");
  }
}

export async function loginUser(userId: string) {
  throw redirect("/", {
    headers: {
      "Set-Cookie": await authCookie.serialize(userId)
    }
  });
}

export async function logoutUser(request: Request) {
  const cookie = await authCookie.parse(request.headers.get("Cookie"));

  if (cookie) {
    throw redirect("/login", {
      headers: {
        "Set-Cookie": await authCookie.serialize("", {
          maxAge: 0
        })
      }
    });
  }
}
