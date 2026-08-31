import {beforeEach, describe, expect, it, vi} from "vitest";
import {NextFunction, Request, Response} from "express";

import {loginSchema} from "../../../../src/modules/auth/validations/login.schema";
import {AuthenticationController} from "../../../../src/modules/auth/controllers/authentication.controller";

const {mockLogin, mockLogout} = vi.hoisted(() => ({
    mockLogin: vi.fn(),
    mockLogout: vi.fn(),
}));

vi.mock("../../../../src/common/utils/catch-async", () => ({
    default: (fn: any) => (req: any, res: any, next: any) =>
        Promise.resolve(fn(req, res, next)).catch(next),
}));

/**
 * Mock the AuthService singleton used by the controller.
 */
vi.mock("../../../../src/modules/auth/services/auth.service", () => ({
    authService: {
        login: mockLogin,
        logout: mockLogout,
    },
}));

vi.mock("../../../../src/modules/auth/validations/login.schema", () => ({
    loginSchema: {
        validateAsync: vi.fn(),
    },
}));

describe("AuthenticationController", () => {
    let req: Partial<Request> & {
        sanitize?: any;
        credentials?: any;
    };
    let res: Partial<Response>;
    let next: NextFunction;

    beforeEach(() => {
        vi.clearAllMocks();

        res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis(),
            send: vi.fn().mockReturnThis(),
        };

        next = vi.fn();

        req = {
            sanitize: {
                body: {
                    get: vi.fn(),
                    only: vi.fn().mockReturnValue({
                        username: "testuser",
                        password: "password123",
                    }),
                    numeric: vi.fn(),
                },
                query: {
                    get: vi.fn(),
                    only: vi.fn(),
                    numeric: vi.fn(),
                },
            },
            credentials: {
                jwt: {
                    tid: 45,
                    uid: 1,
                    tfa: false,
                },
                user: vi.fn(),
                authentication: vi.fn(),
            },
        };
    });

    describe("login()", () => {
        it("should successfully sanitize, validate, and log in a user", async () => {
            const validatedData = {
                username: "testuser",
                password: "password123",
            };

            const mockToken = {
                token: "eyMockJwtToken",
            };

            vi.mocked(loginSchema.validateAsync).mockResolvedValue(validatedData);
            mockLogin.mockResolvedValue(mockToken);

            await AuthenticationController.login(
                req as Request,
                res as Response,
                next,
            );

            expect(req.sanitize?.body.only).toHaveBeenCalledWith([
                "username",
                "password",
            ]);

            expect(loginSchema.validateAsync).toHaveBeenCalledWith(
                validatedData,
                {abortEarly: false},
            );

            expect(mockLogin).toHaveBeenCalledWith(validatedData);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(mockToken);
            expect(next).not.toHaveBeenCalled();
        });

        it("should route validation failures to the error boundary", async () => {
            const validationError = new Error(
                "Validation Error: 'password' is required",
            );

            vi.mocked(loginSchema.validateAsync).mockRejectedValue(
                validationError,
            );

            await AuthenticationController.login(
                req as Request,
                res as Response,
                next,
            );

            expect(next).toHaveBeenCalledWith(validationError);
            expect(mockLogin).not.toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
        });

        it("should forward business layer login failures", async () => {
            const validatedData = {
                username: "nonexistent",
                password: "wrongpassword",
            };

            const authError = new Error("Invalid credentials payload.");

            vi.mocked(loginSchema.validateAsync).mockResolvedValue(
                validatedData,
            );
            mockLogin.mockRejectedValue(authError);

            await AuthenticationController.login(
                req as Request,
                res as Response,
                next,
            );

            expect(mockLogin).toHaveBeenCalledWith(validatedData);
            expect(next).toHaveBeenCalledWith(authError);
            expect(res.status).not.toHaveBeenCalled();
        });

        it("should forward errors when sanitize middleware is missing", async () => {
            delete req.sanitize;

            await AuthenticationController.login(
                req as Request,
                res as Response,
                next,
            );

            expect(next).toHaveBeenCalledWith(expect.any(TypeError));
            expect(res.status).not.toHaveBeenCalled();
            expect(mockLogin).not.toHaveBeenCalled();
        });
    });

    describe("logout()", () => {
        it("should invalidate an active JWT token session", async () => {
            mockLogout.mockResolvedValue(undefined);

            await AuthenticationController.logout(
                req as Request,
                res as Response,
                next,
            );

            expect(mockLogout).toHaveBeenCalledWith(45);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalled();
            expect(next).not.toHaveBeenCalled();
        });

        it("should pass logout errors to the error boundary", async () => {
            const logoutError = new Error(
                "Database transaction aborted during token termination.",
            );

            mockLogout.mockRejectedValue(logoutError);

            await AuthenticationController.logout(
                req as Request,
                res as Response,
                next,
            );

            expect(mockLogout).toHaveBeenCalledWith(45);
            expect(next).toHaveBeenCalledWith(logoutError);
            expect(res.status).not.toHaveBeenCalled();
        });

        it("should forward errors when credentials context is missing", async () => {
            req.credentials = undefined;

            await AuthenticationController.logout(
                req as Request,
                res as Response,
                next,
            );

            expect(next).toHaveBeenCalledWith(expect.any(TypeError));
            expect(res.status).not.toHaveBeenCalled();
            expect(mockLogout).not.toHaveBeenCalled();
        });
    });
});
