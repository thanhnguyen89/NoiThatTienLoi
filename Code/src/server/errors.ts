// ============================================================
// Application Error Classes
// ============================================================

export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 500,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Không tìm thấy tài nguyên') {
    super('NOT_FOUND', message, 404);
  }
}

export class ValidationError extends AppError {
  constructor(
    message: string,
    details?: Record<string, string[]>
  ) {
    super('VALIDATION', message, 422, details);
  }
}

export class DuplicateError extends AppError {
  constructor(field: string, value: string) {
    super('DUPLICATE', `${field} "${value}" đã tồn tại`, 409);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super('CONFLICT', message, 409);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Chưa xác thực') {
    super('UNAUTHORIZED', message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Không có quyền truy cập') {
    super('FORBIDDEN', message, 403);
  }
}

// ============================================================
// Error utilities
// ============================================================

export function parseAppError(err: unknown): AppError {
  if (err instanceof AppError) return err;
  if (err instanceof Error && err.name === 'AppError') {
    return err as AppError;
  }
  return new AppError('INTERNAL', 'Lỗi không xác định', 500);
}

export function isAppError(err: unknown): err is AppError {
  return err instanceof AppError;
}
