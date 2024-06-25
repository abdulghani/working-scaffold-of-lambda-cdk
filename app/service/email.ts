import { createTransport } from "nodemailer";
import { serverOnly$ } from "vite-env-only/macros";

export const email = serverOnly$(
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
