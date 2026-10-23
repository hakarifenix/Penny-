/** A typed error carrying a user-facing i18n message key and field errors. */
export class AppError extends Error {
  readonly code: string;
  readonly messageKey?: string;
  readonly fields?: Record<string, string>;

  constructor(
    code: string,
    options: { messageKey?: string; fields?: Record<string, string>; message?: string } = {},
  ) {
    super(options.message ?? code);
    this.name = "AppError";
    this.code = code;
    this.messageKey = options.messageKey;
    this.fields = options.fields;
  }
}

export function isAppError(err: unknown): err is AppError {
  return err instanceof AppError;
}

/** Extract a readable message from any thrown value. */
export function errorMessage(err: unknown, fallback = "Something went wrong"): string {
  if (isAppError(err) && err.messageKey) return err.messageKey;
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
