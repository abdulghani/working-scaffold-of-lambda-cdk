import { INTERNAL_API_HOST, INTERNAL_API_KEY } from "@/constants/internal-api";
import { serverOnly$ } from "vite-env-only/macros";

export const invokeInternalAction = serverOnly$(async function (options: {
  _action: string;
  [key: string]: any;
}) {
  if (!INTERNAL_API_HOST || !INTERNAL_API_KEY) {
    return;
  }

  return await fetch(`${INTERNAL_API_HOST}/api/internal-action`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": INTERNAL_API_KEY
    },
    body: JSON.stringify(options)
  });
});
