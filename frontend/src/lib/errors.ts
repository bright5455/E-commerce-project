import axios from 'axios';

/**
 * Shape of a NestJS exception body. `message` is a string for most exceptions
 * and a string[] when the global ValidationPipe rejects a DTO.
 */
interface NestErrorBody {
  statusCode?: number;
  message?: string | string[];
  error?: string;
}

export class ApiError extends Error {
  readonly status: number;
  /** Field-level messages from ValidationPipe, if any. */
  readonly details: string[];

  constructor(message: string, status: number, details: string[] = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }

  get isUnauthorized() {
    return this.status === 401;
  }
}

const STATUS_FALLBACKS: Record<number, string> = {
  400: 'Some of the details you entered are not valid. Please check and try again.',
  401: 'Your session has expired. Please sign in again.',
  403: 'You do not have permission to do that.',
  404: 'We could not find what you were looking for.',
  409: 'That conflicts with something that already exists.',
  422: 'Some of the details you entered are not valid.',
  429: 'Too many attempts. Please wait a moment and try again.',
  500: 'Something went wrong on our end. Please try again shortly.',
  502: 'The server is unreachable right now. Please try again shortly.',
  503: 'The service is temporarily unavailable. Please try again shortly.',
};

/**
 * Converts anything thrown by axios into an ApiError carrying a message that is
 * safe and useful to show a shopper. Backend messages are preferred when they
 * are written for humans (they are, throughout this API); framework-generic
 * strings fall back to our own copy.
 */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;

  if (axios.isAxiosError<NestErrorBody>(error)) {
    if (error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED') {
      return new ApiError(
        'Cannot reach the server. Check your connection and make sure the API is running.',
        0,
      );
    }

    const status = error.response?.status ?? 0;
    const raw = error.response?.data?.message;

    if (Array.isArray(raw) && raw.length > 0) {
      return new ApiError(raw[0], status, raw);
    }

    if (typeof raw === 'string' && raw.trim() && raw !== 'Internal server error') {
      return new ApiError(raw, status);
    }

    return new ApiError(
      STATUS_FALLBACKS[status] ?? 'Something went wrong. Please try again.',
      status,
    );
  }

  if (error instanceof Error && error.message) {
    return new ApiError(error.message, 0);
  }

  return new ApiError('Something went wrong. Please try again.', 0);
}

/** Convenience for UI code that only needs the text. */
export function getErrorMessage(error: unknown): string {
  return toApiError(error).message;
}
