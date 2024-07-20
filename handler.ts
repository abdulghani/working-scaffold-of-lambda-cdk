import { APIGatewayProxyEventV2 } from "aws-lambda";
import { initializeLocale } from "./@/lib/date.js";
import { initializeVapid } from "./@/lib/initialize-vapid.js";
import { createRequestHandler } from "./@/lib/request-handler";
import * as build from "./build/server/index.js";

initializeLocale();
initializeVapid();

export const handler = createRequestHandler({
  build: build as any,
  getLoadContext: async (event: APIGatewayProxyEventV2) => {
    return {
      url: event.rawPath,
      method: event.requestContext.http.method,
      headers: event.headers,
      cookies: event.cookies,
      context: event.requestContext
    };
  }
});
