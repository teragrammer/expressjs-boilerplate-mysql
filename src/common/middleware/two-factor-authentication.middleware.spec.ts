// src/common/middleware/two-factor-authentication.middleware.spec.ts
import {beforeEach, describe, expect, it, vi} from "vitest";
import {NextFunction, Request, Response} from "express";
import {TwoFactorAuthenticationMiddleware} from "./two-factor-authentication.middleware";
import errors from "../utils/messages";
import {assertCredentials} from "../utils/request-credentials";

// Mock the request-credentials utility
vi.mock("../utils/request-credentials", () => ({
    assertCredentials: vi.fn(),
}));

describe("TwoFactorAuthenticationMiddleware", () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let nextFunction: NextFunction;

    beforeEach(() => {
        vi.clearAllMocks();
        mockRequest = {};
        mockResponse = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn(),
        };
        nextFunction = vi.fn();
    });

    describe("When req.credentials is missing", () => {
        it("should return 401 with AUTH_OTP_EXPIRED when isHalt is true (default)", async () => {
            const middleware = TwoFactorAuthenticationMiddleware(true);

            await middleware(
                mockRequest as Request,
                mockResponse as Response,
                nextFunction
            );

            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({
                code: "AUTH_OTP_EXPIRED",
                message: errors.EXPIRED_AUTH_TOKEN.message,
            });
            expect(nextFunction).not.toHaveBeenCalled();
            expect(assertCredentials).not.toHaveBeenCalled();
        });

        it("should call next() without responding when isHalt is false", async () => {
            const middleware = TwoFactorAuthenticationMiddleware(false);

            await middleware(
                mockRequest as Request,
                mockResponse as Response,
                nextFunction
            );

            expect(mockResponse.status).not.toHaveBeenCalled();
            expect(mockResponse.json).not.toHaveBeenCalled();
            expect(nextFunction).toHaveBeenCalledTimes(1);
            expect(assertCredentials).not.toHaveBeenCalled();
        });
    });

    describe("When req.credentials is present", () => {
        beforeEach(() => {
            mockRequest.credentials = {
                jwt: {
                    tfa: false,
                    // Add other required mock JWT properties if needed by type constraints
                } as any,
                user: vi.fn(),
                authentication: vi.fn(),
            };
        });

        it("should call assertCredentials and return 403 with AUTH_OTP_INCOMPLETE when tfa is falsy", async () => {
            const middleware = TwoFactorAuthenticationMiddleware();

            await middleware(
                mockRequest as Request,
                mockResponse as Response,
                nextFunction
            );

            expect(assertCredentials).toHaveBeenCalledWith(mockRequest);
            expect(mockResponse.status).toHaveBeenCalledWith(403);
            expect(mockResponse.json).toHaveBeenCalledWith({
                code: "AUTH_OTP_INCOMPLETE",
                message: errors.INCOMPLETE_OTP.message,
            });
            expect(nextFunction).not.toHaveBeenCalled();
        });

        it("should call assertCredentials and invoke next() when tfa is truthy", async () => {
            if (mockRequest.credentials) {
                mockRequest.credentials.jwt.tfa = true;
            }

            const middleware = TwoFactorAuthenticationMiddleware();

            await middleware(
                mockRequest as Request,
                mockResponse as Response,
                nextFunction
            );

            expect(assertCredentials).toHaveBeenCalledWith(mockRequest);
            expect(mockResponse.status).not.toHaveBeenCalled();
            expect(mockResponse.json).not.toHaveBeenCalled();
            expect(nextFunction).toHaveBeenCalledTimes(1);
        });
    });
});