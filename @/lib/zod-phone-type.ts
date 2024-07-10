import { z, ZodIssueCode } from "zod";
import { PHONE_REGEXP } from "./phone-regex";

export const ZOD_PHONE_TYPE = z
  .string()
  .trim()
  .superRefine((i, ctx) => {
    if (!i) {
      return;
    } else if (PHONE_REGEXP.test(i)) {
      return ctx.addIssue({
        code: ZodIssueCode.custom,
        message: "Hanya boleh angka"
      });
    } else if (i.length < 8) {
      return ctx.addIssue({
        code: ZodIssueCode.too_small,
        minimum: 8,
        inclusive: true,
        type: "string",
        message: "Minimal 8 angka"
      });
    } else if (i.length > 20) {
      return ctx.addIssue({
        code: ZodIssueCode.too_big,
        maximum: 20,
        inclusive: true,
        type: "string",
        message: "Maksimal 20 angka"
      });
    }
  });
