// src/common/utils/errors.spec.ts
import { describe, expect, it } from "vitest";
import Messages from "./messages";
import { AppError } from "./errors";

describe("AppError", () => {
    it("should correctly instantiate with error metadata from Messages", () => {
        const error = new AppError(Messages.DATA_NOT_FOUND);

        expect(error).toBeInstanceOf(Error);
        expect(error).toBeInstanceOf(AppError);
        expect(error.message).toBe(Messages.DATA_NOT_FOUND.message);
        expect(error.errorCode).toBe(Messages.DATA_NOT_FOUND.code);
        expect(error.statusCode).toBe(Messages.DATA_NOT_FOUND.status);
    });

    it("should allow overriding the default message with a custom message", () => {
        const customMsg = "Specific user profile could not be located";
        const error = new AppError(Messages.DATA_NOT_FOUND, customMsg);

        expect(error.message).toBe(customMsg);
        expect(error.errorCode).toBe(Messages.DATA_NOT_FOUND.code);
        expect(error.statusCode).toBe(Messages.DATA_NOT_FOUND.status);
    });

    it("should capture stack trace and preserve proper prototype chain", () => {
        const error = new AppError(Messages.SERVER_ERROR);

        // Check if stack trace is defined
        expect(error.stack).toBeDefined();

        // Verify prototype chain is correctly maintained (important for instanceof checks with custom Error subclasses)
        expect(Object.getPrototypeOf(error)).toBe(AppError.prototype);
    });
});