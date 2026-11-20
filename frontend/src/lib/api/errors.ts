export type ApiErrorKind = "unreachable" | "not_found" | "http" | "bad_response";

/** Every backend failure becomes one of these, so callers handle a single shape. */
export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly path: string;
  readonly status?: number;
  readonly responseBody?: string;

  constructor(
    kind: ApiErrorKind,
    path: string,
    message: string,
    options: { status?: number; cause?: unknown; responseBody?: string } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = "ApiError";
    this.kind = kind;
    this.path = path;
    this.status = options.status;
    this.responseBody = options.responseBody;
  }
}
