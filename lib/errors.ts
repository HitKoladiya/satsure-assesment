import type { ApiError } from "@/types";

export class AppError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
  }
}

export function toErrorResponse(err: unknown): Response {
  if (err instanceof AppError) {
    const body: ApiError = { error: { code: err.code, message: err.message } };
    return Response.json(body, { status: err.status });
  }
  const body: ApiError = {
    error: { code: "INTERNAL_ERROR", message: "Something went wrong. Please try again." },
  };
  return Response.json(body, { status: 500 });
}
