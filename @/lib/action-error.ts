import { json } from "@remix-run/node";

/** EXTENDS RESPONSE TO BE HANDLED AUTOMATICALLY BY REMIX */
export class ActionError extends Response {
  public message?: string;
  public description?: string;
  public details?: any;
  public _headers?: HeadersInit;

  constructor(options: {
    message: string;
    status?: number;
    details?: any;
    headers?: HeadersInit;
    description?: string;
  }) {
    super(
      /** PASS JSON TO BE PARSED IN RESPONSE ERROR-BOUNDARY */
      JSON.stringify({
        error: {
          message: options.message,
          description: options.description,
          details: options.details
        }
      }),
      {
        status: options.status || 500,
        headers: ActionError.addHeader(options.headers)
      }
    );

    this.message = options.message;
    this.description = options.description;
    this.details = options.details;
    this._headers = options.headers;
  }

  static addHeader(headers?: HeadersInit): HeadersInit {
    if (Array.isArray(headers)) {
      return [...headers, ["Content-Type", "application/json"]];
    }
    return {
      ...(headers || {}),
      "Content-Type": "application/json"
    };
  }
}

export function wrapActionError(action: any) {
  return async function (...args: any) {
    try {
      return await action(...args);
    } catch (error) {
      if (error instanceof ActionError) {
        return json(
          {
            error: {
              message: error.message,
              description: error.description,
              details: error.details
            }
          },
          {
            status: error.status,
            headers: error._headers
          }
        );
      }

      throw error;
    }
  };
}
