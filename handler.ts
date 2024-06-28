import { createRequestHandler } from "./@/lib/request-handler";
import * as build from "./build/server/index.js";

const remixHandler = createRequestHandler({
  build
});

export async function handler(...args: any) {
  const [event] = args;

  /** REDIRECT ASSET/PUBLIC FILES */
  if (
    event.requestContext.http.method === "GET" &&
    event.rawPath.startsWith("/assets/")
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
