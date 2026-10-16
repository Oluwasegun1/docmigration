export type ErrorCode =
  | "validation_error"
  | "unauthenticated"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "rate_limited"
  | "not_configured"
  | "internal_error";

const STATUS: Record<ErrorCode, number> = {
  validation_error: 400,
  unauthenticated: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  rate_limited: 429,
  not_configured: 503,
  internal_error: 500,
};

/** Error safe to show to the user. Never put secrets or personal data in `message`. */
export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
  get status() {
    return STATUS[this.code];
  }
}

export type ApiErrorBody = {
  error: { code: ErrorCode; message: string; details?: unknown };
};

/** Consistent JSON error response. Unknown errors are masked. */
export function toErrorResponse(err: unknown): Response {
  if (err instanceof AppError) {
    const body: ApiErrorBody = {
      error: { code: err.code, message: err.message, details: err.details },
    };
    return Response.json(body, { status: err.status });
  }
  console.error("Unhandled error", err instanceof Error ? err.name : "unknown");
  const body: ApiErrorBody = {
    error: { code: "internal_error", message: "Something went wrong." },
  };
  return Response.json(body, { status: 500 });
}
