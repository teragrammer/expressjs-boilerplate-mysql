// src/common/utils/request-credentials.spec.ts
import { describe, expect, it } from "vitest";
import { Request } from "express";
import { assertCredentials } from "./request-credentials";
import { Messages } from "./messages";
import { AppError } from "./errors";

describe("assertCredentials", () => {
    it("should pass silently and narrow the type when credentials are present", () => {
        const mockRequest = {
            credentials: {
                jwt: {} as any,
                user: async () => ({} as any),
                authentication: async () => ({} as any),
            },
        } as unknown as Request;

        expect(() => assertCredentials(mockRequest)).not.toThrow();
    });

    it("should throw an AppError with 401 status and correct code/message when credentials are missing", () => {
        const mockRequest = {} as unknown as Request;

        try {
            assertCredentials(mockRequest);
            expect.fail("Expected assertCredentials to throw an error");
        } catch (error: any) {
            expect(error).toBeInstanceOf(AppError);
            expect(error.statusCode).toBe(401);
            expect(error.errorCode).toBe(Messages.INVALID_AUTH_TOKEN.code);
            expect(error.message).toBe(Messages.INVALID_AUTH_TOKEN.message);
        }
    });
});