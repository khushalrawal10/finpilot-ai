// ============================================================
// Application Error Hierarchy
// ============================================================

export class AppError extends Error {
  constructor(
    public override message: string,
    public code: string,
  ) {
    super(message);
    this.name = 'AppError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class AuthError extends AppError {
  constructor(message: string, code: string = 'AUTH_ERROR') {
    super(message, code);
    this.name = 'AuthError';
  }
}

export class DataError extends AppError {
  constructor(message: string, code: string = 'DATA_ERROR') {
    super(message, code);
    this.name = 'DataError';
  }
}

export class AIError extends AppError {
  constructor(message: string, code: string = 'AI_ERROR') {
    super(message, code);
    this.name = 'AIError';
  }
}

export class ValidationError extends AppError {
  public fields?: Record<string, string>;

  constructor(message: string, fields?: Record<string, string>) {
    super(message, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
    this.fields = fields;
  }
}

// ============================================================
// User-friendly error message mapper
// ============================================================

export function toUserMessage(error: unknown): string {
  if (error instanceof ValidationError) {
    const fieldMessages = error.fields
      ? Object.values(error.fields).join(', ')
      : null;
    return fieldMessages
      ? `Please fix the following: ${fieldMessages}`
      : error.message;
  }

  if (error instanceof AuthError) {
    return 'Authentication failed. Please sign in again.';
  }

  if (error instanceof AIError) {
    return 'AI service is temporarily unavailable. Please try again shortly.';
  }

  if (error instanceof DataError) {
    return 'Unable to load your data. Please check your connection and retry.';
  }

  if (error instanceof AppError) {
    return error.message;
  }

  if (error instanceof Error) {
    return 'Something went wrong. Please try again.';
  }

  return 'An unexpected error occurred.';
}
