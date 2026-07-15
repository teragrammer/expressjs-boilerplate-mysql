// src/common/utils/errors.ts

/**
 * A reusable custom error class for clean, scalable Express error handling.
 * Allows throwing errors with custom HTTP status codes and API error codes.
 */
export class AppError extends Error {
    public errorCode: string;
    public statusCode: number;

    constructor(message: string, errorCode: string, statusCode: number) {
        super(message);
        this.errorCode = errorCode;
        this.statusCode = statusCode;

        // Restores proper prototype chain for ES5 inheritance
        Object.setPrototypeOf(this, new.target.prototype);

        // Captures the call stack trace, omitting this constructor call
        Error.captureStackTrace(this, this.constructor);
    }
}