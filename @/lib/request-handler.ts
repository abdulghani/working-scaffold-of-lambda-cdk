/*eslint-env node*/
import {
  ServerBuild,
  createRequestHandler as createRemixHandler,
  readableStreamToString
} from "@remix-run/node";
import type {
  APIGatewayProxyEventHeaders,
  APIGatewayProxyEventV2,
  APIGatewayProxyHandlerV2,
  APIGatewayProxyResultV2
} from "aws-lambda";
import { isBinaryType } from "./binary-types";

function createRemixHeaders(
  requestHeaders: APIGatewayProxyEventHeaders,
  requestCookies?: string[]
): Headers {
  const headers = new Headers();

  for (const [header, value] of Object.entries(requestHeaders)) {
    if (value) {
      headers.append(header, value);
    }
  }

  if (requestCookies) {
    for (const cookie of requestCookies) {
      headers.append("Cookie", cookie);
    }
  }

  return headers;
}

function createRemixRequest(event: APIGatewayProxyEventV2): Request {
  const host = event.headers["x-forwarded-host"] || event.headers.host;
  const search = event.rawQueryString?.length ? `?${event.rawQueryString}` : "";
  const scheme = event.headers["x-forwarded-proto"] || "http";
  const url = new URL(`${scheme}://${host}${event.rawPath}${search}`);
  const isFormData = event.headers["content-type"]?.includes(
    "multipart/form-data"
  );

  const controller = new AbortController();
  return new Request(url.href, {
    method: event.requestContext.http.method,
    headers: createRemixHeaders(event.headers, event.cookies),
    signal: controller.signal,
    body:
      event.body && event.isBase64Encoded
        ? isFormData
          ? Buffer.from(event.body, "base64")
          : Buffer.from(event.body, "base64").toString()
        : event.body
  });
}

async function sendRemixResponse(
  nodeResponse: Response
): Promise<APIGatewayProxyResultV2> {
  const cookies: string[] = [];

  // Arc/AWS API Gateway will send back set-cookies outside of response headers.
  for (const [key, value] of nodeResponse.headers.entries()) {
    if (key.toLowerCase() === "set-cookie") {
      cookies.push(value);
    }
  }

  if (cookies.length) {
    nodeResponse.headers.delete("Set-Cookie");
  }

  const contentType = nodeResponse.headers.get("Content-Type");
  const isBase64Encoded = isBinaryType(contentType);
  let body: string | undefined;

  if (nodeResponse.body) {
    if (isBase64Encoded) {
      body = await readableStreamToString(nodeResponse.body, "base64");
    } else {
      body = await nodeResponse.text();
    }
  }

  return {
    statusCode: nodeResponse.status,
    headers: Object.fromEntries(nodeResponse.headers.entries()),
    cookies,
    body,
    isBase64Encoded
  };
}

export function createRequestHandler({
  build,
  getLoadContext,
  mode = process.env.NODE_ENV
}: {
  build: ServerBuild;
  getLoadContext?: any;
  mode?: string;
}): APIGatewayProxyHandlerV2 {
  const handleRequest = createRemixHandler(build, mode);

  return async function (event: APIGatewayProxyEventV2) {
    const request = createRemixRequest(event);
    const loadContext = await getLoadContext?.(event);

    const response = await handleRequest(request, loadContext);
    return sendRemixResponse(response);
  };
}
