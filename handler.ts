import { createRequestHandler } from "./@/lib/request-handler";
import * as build from "./build/server/index.js";

const remixHandler = createRequestHandler({
  build
});
const KNOWN_EXTENSIONS = Object.fromEntries(
  (process.env.KNOWN_EXTENSIONS?.split(",") || []).map((i) => [i, true])
);

export async function handler(...args: any) {
  const [event] = args;

  /** REDIRECT ASSET/PUBLIC FILES */
  if (
    event.requestContext?.http?.method === "GET" &&
    event.pathParameters?.proxy &&
    (event.pathParameters.proxy.startsWith("assets/") ||
      KNOWN_EXTENSIONS[
        event.pathParameters.proxy.split("/").pop()?.split(".").pop()
      ])
  ) {
    return {
      statusCode: 301,
      headers: {
        Location: `https://${process.env.BUCKET_NAME}.s3.amazonaws.com/${event.pathParameters.proxy}`
      }
    };
  }

  /** INVOKE HANDLER */
  return await (remixHandler as any)(...args);
}
