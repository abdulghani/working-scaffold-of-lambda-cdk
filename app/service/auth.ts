import { ActionError } from "@/lib/action-error";
import { createCookie, redirect } from "@remix-run/node";
import { INTERNAL_EVENT } from "app/routes/api.internal-action";
import { LRUCache } from "lru-cache";
import { DateTime } from "luxon";
import { ulid } from "ulid";
import { serverOnly$ } from "vite-env-only/macros";
import { dbconn } from "./db";
import { emailClient } from "./email";
import { invokeInternalAction } from "./internal-action";
import { sendNotification } from "./push";

const COOKIE_SECRET = process.env.COOKIE_SECRET || "default";

export const sessionCookie = createCookie("session", {
  httpOnly: true,
  path: "/",
  sameSite: "lax",
  secrets: [COOKIE_SECRET],
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 60 * 24 * 7 // 7 days
});

export const destinationCookie = createCookie("destination", {
  httpOnly: true,
  path: "/",
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 60 * 24 * 3 // 3 days
});

export const otpFlowCookie = createCookie("otpFlow", {
  httpOnly: true,
  path: "/",
  sameSite: "lax",
  secrets: [COOKIE_SECRET],
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 60 * 1 // 1 hour
});

const SESSION_CACHE = new LRUCache({
  ttl: 1000 * 60 * 60, // 1 hour,
  ttlAutopurge: true
});

export async function sendOTP(email: string) {
  if (!email) {
    throw new ActionError({
      message: "Validation error",
      status: 422,
      details: { email: "Email harus diisi" }
    });
  }

  const user = await dbconn?.("user")
    .where({ email, is_disabled: false })
    .first();

  if (!user) {
    throw new ActionError({
      message: "User not found/active",
      status: 404,
      details: { email: "Email tidak ditemukan" }
    });
  }

  const userNotification = Object.values(user.notification_settings || {}).find(
    Boolean
  );

  const otpCode = String(Math.random()).slice(-6);
  const transaction = await dbconn?.transaction();
  const otpEntry = await transaction?.("otp_code")
    .where({ user_id: user.id })
    .first();

  if (!otpEntry) {
    await transaction?.("otp_code").insert({
      user_id: user.id,
      otp_code: otpCode,
      is_completed: false,
      updated_at: new Date().toISOString()
    });
  } else {
    await transaction?.("otp_code").where({ user_id: user.id }).update({
      otp_code: otpCode,
      is_completed: false,
      updated_at: new Date().toISOString()
    });
  }
  await transaction?.commit();
  await emailClient?.sendMail({
    sender: "PRANAGA OTP<info@pranaga.com>",
    to: [user.email],
    subject: "Kode OTP Login",
    text: `Kode OTP login Anda adalah: ${otpCode}`
  });

  throw redirect("/login", {
    headers: [
      [
        "Set-Cookie",
        await otpFlowCookie.serialize({
          id: user.id,
          email: user.email,
          notification: userNotification
        })
      ]
    ]
  });
}

export async function verifyOTP(options: {
  request: Request;
  otpCode: string;
  push_subscription?: string;
}) {
  if (!options.otpCode) {
    throw new ActionError({
      message: "Validation error",
      status: 422,
      details: { otp: "Kode OTP harus diisi" }
    });
  }
  const otpFlow = await otpFlowCookie.parse(
    options.request.headers.get("Cookie")
  );
  const otpEntry = await dbconn?.("otp_code")
    .where({ user_id: otpFlow.id })
    .first();

  if (!otpEntry) {
    throw new ActionError({
      message: "OTP not found",
      headers: [
        ["Set-Cookie", await otpFlowCookie.serialize("", { maxAge: 0 })]
      ]
    });
  }

  if (otpEntry.otp_code !== options.otpCode || otpEntry.is_completed) {
    throw new ActionError({
      message: "Invalid OTP",
      details: {
        otp: "Kode OTP tidak sesuai"
      }
    });
  }

  const sessionToken = ulid();
  const transaction = await dbconn?.transaction();
  await transaction?.("otp_code")
    .where({ user_id: otpFlow.id })
    .update({ is_completed: true });
  await transaction?.("session").insert({
    user_id: otpFlow.id,
    session_id: sessionToken,
    created_at: new Date().toISOString(),
    expires_at: DateTime.now().plus({ days: 7 }).toISO(),
    notification_subscription: options.push_subscription || null
  });
  await transaction?.commit();
  SESSION_CACHE.delete(sessionToken);

  if (options.push_subscription) {
    const parsed = JSON.parse(options.push_subscription);
    await sendNotification?.({
      subscription: parsed,
      title: "Anda berhasil login",
      path: "/admin"
    });
  }

  /** CLEANUP SESSION BY INVOKING ANOTHER API */
  invokeInternalAction?.({
    _action: INTERNAL_EVENT.CLEANUP_SESSION
  });

  const destination = await destinationCookie.parse(
    options.request.headers.get("Cookie")
  );
  throw redirect(destination || "/", {
    headers: [
      ["Set-Cookie", await sessionCookie.serialize(sessionToken)],
      ["Set-Cookie", await otpFlowCookie.serialize("", { maxAge: 0 })],
      ["Set-Cookie", await destinationCookie.serialize("", { maxAge: 0 })]
    ]
  });
}

export const redirectLoggedIn = serverOnly$(async (request: Request) => {
  const sessionToken = await sessionCookie.parse(request.headers.get("Cookie"));

  if (sessionToken) {
    const session = await dbconn?.("session")
      .where({ session_id: sessionToken })
      .first();

    // expres_at already in DateTime type (weird)
    if (session && session.expires_at > DateTime.now()) {
      throw redirect("/admin");
    }
  }
});

export const verifySession = serverOnly$(async (request: Request) => {
  const sessionToken = await sessionCookie.parse(request.headers.get("Cookie"));
  const destination = request.url;

  if (!sessionToken) {
    throw redirect("/login", {
      headers: [
        ["Set-Cookie", await sessionCookie.serialize("", { maxAge: 0 })],
        ["Set-Cookie", await destinationCookie.serialize(destination)]
      ]
    });
  }
  const session = await (async () => {
    if (SESSION_CACHE.has(sessionToken)) {
      return SESSION_CACHE.get(sessionToken);
    }
    const _session = await dbconn?.("session")
      .where({ session_id: sessionToken })
      .first();
    if (_session) {
      SESSION_CACHE.set(sessionToken, _session);
    }
    return _session;
  })();

  // expres_at already in DateTime type (weird)
  if (!session || session.expires_at < DateTime.now()) {
    SESSION_CACHE.delete(sessionToken);
    throw redirect("/login", {
      headers: [
        ["Set-Cookie", await sessionCookie.serialize("", { maxAge: 0 })],
        ["Set-Cookie", await destinationCookie.serialize(destination)]
      ]
    });
  }

  return session.user_id;
});

export const verifySessionPOSAccess = serverOnly$(
  async (request: Request, posId: string) => {
    const userId = await verifySession?.(request);
    const connection = await dbconn?.("user_pos")
      .where({ user_id: userId, pos_id: posId })
      .first();
    if (!connection) {
      throw new ActionError({
        message: "Tidak bisa mengakses POS",
        description: "Anda tidak memiliki admin akses ke POS ini",
        status: 403
      });
    }

    return { posId, userId };
  }
);

export const getSessionPOS = serverOnly$(async (request: Request) => {
  const userId = await verifySession?.(request);
  const connections = await dbconn?.("user_pos")
    .where({ user_id: userId })
    .first();

  if (!connections) {
    throw redirect("/login");
  }

  return connections;
});

export const cleanupSession = serverOnly$(async () => {
  SESSION_CACHE.clear();
  await dbconn?.("session")
    .where("expires_at", "<", new Date().toISOString())
    .delete();
});
