export type AppErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "INVALID_CREDENTIALS"
  | "INVALID_GOOGLE_TOKEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "FORBIDDEN"
  | "INVITATION_DATE_NOT_TODAY"
  | "INVALID_INVITATION_RESPONSE"
  | "PUBLIC_TAG_GENERATION_FAILED";

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly httpStatus: number;
  readonly details: unknown | undefined;

  constructor(code: AppErrorCode, message: string, httpStatus: number, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.httpStatus = httpStatus;
    this.details = details;
  }
}

export const AppErrors = {
  validation: (message: string, details?: unknown) => new AppError("VALIDATION_ERROR", message, 400, details),
  unauthorized: () => new AppError("UNAUTHORIZED", "Authentication required", 401),
  invalidCredentials: () => new AppError("INVALID_CREDENTIALS", "Invalid credentials", 401),
  invalidGoogleToken: () => new AppError("INVALID_GOOGLE_TOKEN", "Invalid Google authentication token", 401),
  notFound: (message = "Resource not found") => new AppError("NOT_FOUND", message, 404),
  conflict: (message: string) => new AppError("CONFLICT", message, 409),
  forbidden: (message = "Forbidden") => new AppError("FORBIDDEN", message, 403),
  invitationDateNotToday: () =>
    new AppError("INVITATION_DATE_NOT_TODAY", "Invitation time must be during the current day", 400),
  invalidInvitationResponse: (message: string) => new AppError("INVALID_INVITATION_RESPONSE", message, 400),
  publicTagGenerationFailed: () =>
    new AppError("PUBLIC_TAG_GENERATION_FAILED", "Could not generate a unique public tag", 500)
} as const;
