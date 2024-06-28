import { createTransport } from "nodemailer";
import { serverOnly$ } from "vite-env-only/macros";

export const emailClient = serverOnly$(
  createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD
    }
  })
);

export const sendOTP = serverOnly$(async function (options: {
  email: string;
  otp: string;
}) {
  return emailClient?.sendMail({
    sender: "PRANAGA OTP<info.pranaga.com>",
    to: [options.email],
    subject: "Kode OTP Login",
    text: `Kode OTP login Anda adalah: ${options.otp}`
  });
});
