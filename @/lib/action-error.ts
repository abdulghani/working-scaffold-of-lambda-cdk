import { json } from "@remix-run/node";

export class ActionError extends Error {
  public status: number;
  public details?: any;
  public headers?: HeadersInit;
  public description?: string;

  constructor(options: {
    message: string;
    status?: number;
    details?: any;
    headers?: HeadersInit;
    description?: string;
  }) {
    super(options.message);
    this.status = options.status || 500;
    this.details = options.details;
    this.headers = options.headers;
    this.description = options.description;
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
              details: error.details
            }
          },
          {
            status: error.status,
            headers: error.headers
          }
        );
      }

      throw error;
    }
  };
}
