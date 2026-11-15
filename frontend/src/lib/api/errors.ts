export type ApiErrorKind = "unreachable" | "not_found" | "http" | "bad_response";

/** Every backend failure becomes one of these, so callers handle a single shape. */
export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly path: string;
  readonly status?: number;

  constructor(
    kind: ApiErrorKind,
    path: string,
    message: string,
    options: { status?: number; cause?: unknown } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = "ApiError";
    this.kind = kind;
    this.path = path;
    this.status = options.status;
  }
}
