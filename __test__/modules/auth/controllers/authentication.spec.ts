import {beforeEach, describe, expect, it, vi} from "vitest";
import {NextFunction, Request, Response} from "express";
// 4. Safe imports now that all underlying utilities and services are securely mocked
import {loginSchema} from "../../../../src/modules/auth/validations/login.schema";
import AuthenticationController from "../../../../src/modules/auth/controllers/authentication.controller";

// 1. Use vi.hoisted to instantiate isolated spies that survive Vitest's module loading phase safely
const {mockLogin, mockLogout} = vi.hoisted(() => {
    return {
        mockLogin: vi.fn(),
        mockLogout: vi.fn()
    };
});

// 2. Mock catchAsync to explicitly return the promise chain so 'await' works correctly in tests
vi.mock("../../../../src/common/utils/catch-async", () => {
    return {
        default: (fn: any) => (req: any, res: any, next: any) =>
            Promise.resolve(fn(req, res, next)).catch(next)
    };
});

// 3. Comprehensive mock of AuthService
vi.mock("../../../../src/modules/auth/services/auth.service", () => {
    return {
        AuthService: vi.fn(class {
            login = mockLogin;
            logout = mockLogout;
        })
    };
});

// Mock the Joi schema validation
vi.mock("../../../../src/modules/auth/validations/login.schema", () => {
    return {
        loginSchema: {
            validateAsync: vi.fn(),
        },
    };
});

describe("Authentication Controller", () => {
    let req: Partial<Request> & { sanitize?: any; credentials?: any };
    let res: Partial<Response>;
    let next: NextFunction;

    beforeEach(() => {
        mockLogin.mockClear();
        mockLogout.mockClear();
        vi.mocked(loginSchema.validateAsync).mockClear();

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
                    only: vi.fn().mockReturnValue({username: "testuser", password: "password123"}),
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
        it("should successfully sanitize, validate, and log in a user (Happy Path)", async () => {
            const mockToken = {token: "eyMockJwtToken"};

            vi.mocked(loginSchema.validateAsync).mockResolvedValue({
                username: "testuser",
                password: "password123",
            });
            mockLogin.mockResolvedValue(mockToken);

            await AuthenticationController.login(req as Request, res as Response, next);

            expect(req.sanitize?.body.only).toHaveBeenCalledWith(["username", "password"]);
            expect(loginSchema.validateAsync).toHaveBeenCalledWith(
                {username: "testuser", password: "password123"},
                {abortEarly: false}
            );
            expect(mockLogin).toHaveBeenCalledWith({
                username: "testuser",
                password: "password123",
            });
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(mockToken);
        });

        it("should route validation failures to catchAsync error boundary (Edge Case)", async () => {
            const mockValidationError = new Error("Validation Error: 'password' is required");
            vi.mocked(loginSchema.validateAsync).mockRejectedValue(mockValidationError);

            await AuthenticationController.login(req as Request, res as Response, next);

            expect(next).toHaveBeenCalledWith(mockValidationError);
            expect(res.status).not.toHaveBeenCalled();
        });

        it("should forward business layer login failures down the pipeline (Edge Case)", async () => {
            vi.mocked(loginSchema.validateAsync).mockResolvedValue({
                username: "nonexistent",
                password: "wrongpassword",
            });

            const mockAuthError = new Error("Invalid credentials payload.");
            mockLogin.mockRejectedValue(mockAuthError);

            await AuthenticationController.login(req as Request, res as Response, next);

            expect(next).toHaveBeenCalledWith(mockAuthError);
            expect(res.status).not.toHaveBeenCalled();
        });

        it("should safely intercept errors via catchAsync if sanitize middleware is missing entirely (Security Edge Case)", async () => {
            // Delete sanitize object completely to simulate a middleware failure or omission
            delete req.sanitize;

            await AuthenticationController.login(req as Request, res as Response, next);

            expect(next).toHaveBeenCalledWith(expect.any(TypeError));
            expect(res.status).not.toHaveBeenCalled();
        });
    });

    describe("logout()", () => {
        it("should invalidate and terminate an active JWT token session securely (Happy Path)", async () => {
            mockLogout.mockResolvedValue(undefined);

            await AuthenticationController.logout(req as Request, res as Response, next);

            expect(mockLogout).toHaveBeenCalledWith(45);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalled();
        });

        it("should pass logout errors to catchAsync when token removal fails (Edge Case)", async () => {
            const mockLogoutError = new Error("Database transaction aborted during token termination.");
            mockLogout.mockRejectedValue(mockLogoutError);

            await AuthenticationController.logout(req as Request, res as Response, next);

            expect(next).toHaveBeenCalledWith(mockLogoutError);
            expect(res.status).not.toHaveBeenCalled();
        });

        it("should cleanly intercept and pipe failures if credentials context properties are missing (Security Edge Case)", async () => {
            // Simulate missing middleware attachment scenario on sensitive credentials paths
            req.credentials = undefined as any;

            await AuthenticationController.logout(req as Request, res as Response, next);

            expect(next).toHaveBeenCalledWith(expect.any(TypeError));
            expect(res.status).not.toHaveBeenCalled();
        });
    });
});