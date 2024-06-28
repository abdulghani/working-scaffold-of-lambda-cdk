import { ActionError } from "@/lib/action-error";
import { createCookie, redirect } from "@remix-run/node";
import moment from "moment";
import { ulid } from "ulid";
import { serverOnly$ } from "vite-env-only/macros";
import { dbconn } from "./db";
import { emailClient } from "./email";

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
        await otpFlowCookie.serialize({ id: user.id, email: user.email })
      ]
    ]
  });
}

export async function verifyOTP(options: {
  request: Request;
  otpCode: string;
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
    expires_at: moment().add(7, "day").toISOString()
  });
  await transaction?.commit();

  const destination = await destinationCookie.parse(
    options.request.headers.get("Cookie")
  );
  throw redirect(destination || "/", {
    headers: [
      ["Set-Cookie", await authCookie.serialize(sessionToken)],
      ["Set-Cookie", await otpFlowCookie.serialize("", { maxAge: 0 })]
    ]
  });
}

export const verifySession = serverOnly$(async (request: Request) => {
  const sessionToken = await authCookie.parse(request.headers.get("Cookie"));
  const destination = request.url;

  if (!sessionToken) {
    throw redirect("/login", {
      headers: [
        ["Set-Cookie", await authCookie.serialize("", { maxAge: 0 })],
        ["Set-Cookie", await destinationCookie.serialize(destination)]
      ]
    });
  }
  const session = await dbconn?.("session")
    .where({ session_id: sessionToken })
    .first();
  if (!session || moment(session.expires_at).isBefore(moment())) {
    throw redirect("/login", {
      headers: [
        ["Set-Cookie", await authCookie.serialize("", { maxAge: 0 })],
        ["Set-Cookie", await destinationCookie.serialize(destination)]
      ]
    });
  }

  return session.user_id;
});
