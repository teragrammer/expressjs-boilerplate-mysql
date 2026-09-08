import {beforeEach, describe, expect, it, vi} from "vitest";
import {NextFunction, Request, Response} from "express";

import {AccountController} from "../../../../src/modules/users/controllers/account.controller";
import {AccountService} from "../../../../src/modules/users/services/account.service";
import {User} from "../../../../src/modules/users/user.interface";

const {mockInformation, mockPassword, mockLoggerError} = vi.hoisted(() => ({
    mockInformation: vi.fn(),
    mockPassword: vi.fn(),
    mockLoggerError: vi.fn(),
}));

vi.mock("../../../../src/common/utils/catch-async", () => ({
    default: (fn: any) => (req: any, res: any, next: any) =>
        Promise.resolve(fn(req, res, next)).catch(next),
}));

vi.mock("../../../../src/config/logger", () => ({
    logger: {
        error: mockLoggerError,
    },
}));

describe("AccountController", () => {
    let controller: AccountController;

    let req: Partial<Request> & {
        sanitize?: any;
        credentials?: any;
    };

    let res: Partial<Response>;
    let next: NextFunction;

    const user: User = {
        id: 1,
        first_name: "John",
        middle_name: null,
        last_name: "Doe",
        gender: null,
        address: "123 Main Street",
        phone: "+1234567890",
        is_phone_verified: true,
        email: "john@example.com",
        is_email_verified: true,
        has_tfa: false,
        tfa_secret: null,
        role_id: 1,
        username: "johndoe",
        password: "$2b$10$hashed-password",
        status: "Activated",
        login_tries: 0,
        failed_login_expired_at: null,
        comments: null,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
    };

    const invokeInformation = async () => {
        await controller.information(
            req as Request,
            res as Response,
            next,
        );
    };

    const invokePassword = async () => {
        await controller.password(
            req as Request,
            res as Response,
            next,
        );
    };

    const expectServerError = (error: unknown = expect.anything()) => {
        expect(mockLoggerError).toHaveBeenCalledTimes(1);
        expect(mockLoggerError).toHaveBeenCalledWith(error);

        expect(res.status).toHaveBeenCalledTimes(1);
        expect(res.status).toHaveBeenCalledWith(500);

        expect(res.json).toHaveBeenCalledTimes(1);
        expect(res.json).toHaveBeenCalledWith({
            code: expect.anything(),
            message: expect.any(String),
        });

        expect(next).not.toHaveBeenCalled();
    };

    beforeEach(() => {
        vi.clearAllMocks();

        const accountService = {
            information: mockInformation,
            password: mockPassword,
        } as unknown as AccountService;

        controller = new AccountController(accountService);

        res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis(),
        };

        next = vi.fn();

        req = {
            credentials: {
                jwt: {
                    uid: 1,
                },
                user: vi.fn().mockResolvedValue(user),
            },

            sanitize: {
                body: {
                    only: vi.fn(),
                    get: vi.fn(),
                    numeric: vi.fn(),
                },
                query: {
                    only: vi.fn(),
                    get: vi.fn(),
                    numeric: vi.fn(),
                },
                data: {
                    first_name: "John",
                    middle_name: "Michael",
                    last_name: "Doe",
                    address: "456 New Street",
                },
            },
        };
    });

    describe("information()", () => {
        it("should update account information using the authenticated user ID and validated data", async () => {
            const validatedData = {
                first_name: "John",
                middle_name: "Michael",
                last_name: "Doe",
                address: "456 New Street",
            };

            const token = "mocked-jwt-token-string";

            req.sanitize!.data = validatedData;
            mockInformation.mockResolvedValue(token);

            await invokeInformation();

            expect(mockInformation).toHaveBeenCalledTimes(1);
            expect(mockInformation).toHaveBeenCalledWith(
                1,
                validatedData,
            );

            // Validation belongs to the validation middleware,
            // not the controller.
            expect(req.sanitize!.body.only).not.toHaveBeenCalled();

            expect(res.status).toHaveBeenCalledTimes(1);
            expect(res.status).toHaveBeenCalledWith(200);

            expect(res.json).toHaveBeenCalledTimes(1);
            expect(res.json).toHaveBeenCalledWith(token);

            expect(mockLoggerError).not.toHaveBeenCalled();
            expect(next).not.toHaveBeenCalled();
        });

        it("should use the authenticated user's UID instead of a request body ID", async () => {
            const validatedData = {
                first_name: "Jane",
                middle_name: null,
                last_name: "Smith",
                address: "789 Another Street",
            };

            req.credentials!.jwt.uid = 42;
            req.sanitize!.data = validatedData;

            mockInformation.mockResolvedValue("new-token");

            await invokeInformation();

            expect(mockInformation).toHaveBeenCalledWith(
                42,
                validatedData,
            );

            expect(mockInformation).not.toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({
                    id: expect.anything(),
                }),
            );

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith("new-token");
            expect(next).not.toHaveBeenCalled();
        });

        it("should return a 500 server error when the service throws", async () => {
            const validatedData = {
                first_name: "John",
                middle_name: "Michael",
                last_name: "Doe",
                address: "456 New Street",
            };

            const serviceError = new Error(
                "Failed to update account information",
            );

            req.sanitize!.data = validatedData;
            mockInformation.mockRejectedValue(serviceError);

            await invokeInformation();

            expect(mockInformation).toHaveBeenCalledWith(
                1,
                validatedData,
            );

            expectServerError(serviceError);
        });

        it("should return 500 when credentials are missing", async () => {
            delete req.credentials;

            await invokeInformation();

            expect(mockInformation).not.toHaveBeenCalled();

            expectServerError(expect.any(TypeError));
        });

        it("should return 500 when sanitize context is missing", async () => {
            delete req.sanitize;

            await invokeInformation();

            expect(mockInformation).not.toHaveBeenCalled();

            expectServerError(expect.any(TypeError));
        });

        it("should forward an unexpected service result to the response", async () => {
            req.sanitize!.data = {
                first_name: "John",
                last_name: "Doe",
            };

            mockInformation.mockResolvedValue(undefined);

            await invokeInformation();

            // The controller does not validate the service result.
            // It simply forwards whatever AccountService returns.
            expect(mockInformation).toHaveBeenCalledWith(
                1,
                req.sanitize!.data,
            );

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(undefined);
            expect(next).not.toHaveBeenCalled();
        });
    });

    describe("password()", () => {
        it("should update account password using the authenticated user and validated data", async () => {
            const validatedData = {
                current_password: "CurrentPassword123!",
                new_password: "NewPassword123!",
                username: "johndoe",
                email: "john@example.com",
                phone: "+1234567890",
            };

            const token = "mocked-password-update-token";

            req.sanitize!.data = validatedData;
            mockPassword.mockResolvedValue(token);

            await invokePassword();

            expect(req.credentials!.user).toHaveBeenCalledTimes(1);
            expect(req.credentials!.user).toHaveBeenCalledWith();

            expect(mockPassword).toHaveBeenCalledTimes(1);
            expect(mockPassword).toHaveBeenCalledWith(
                user,
                validatedData,
            );

            // Validation belongs to the validation middleware,
            // not the controller.
            expect(req.sanitize!.body.only).not.toHaveBeenCalled();

            expect(res.status).toHaveBeenCalledTimes(1);
            expect(res.status).toHaveBeenCalledWith(200);

            expect(res.json).toHaveBeenCalledTimes(1);
            expect(res.json).toHaveBeenCalledWith(token);

            expect(mockLoggerError).not.toHaveBeenCalled();
            expect(next).not.toHaveBeenCalled();
        });

        it("should pass the exact user returned by credentials.user() to the service", async () => {
            const authenticatedUser = {
                ...user,
                id: 99,
                username: "authenticated-user",
            };

            const validatedData = {
                current_password: "CurrentPassword123!",
                new_password: "NewPassword123!",
            };

            req.credentials!.user.mockResolvedValue(authenticatedUser);
            req.sanitize!.data = validatedData;

            mockPassword.mockResolvedValue("new-token");

            await invokePassword();

            expect(req.credentials!.user).toHaveBeenCalledTimes(1);

            expect(mockPassword).toHaveBeenCalledTimes(1);
            expect(mockPassword).toHaveBeenCalledWith(
                authenticatedUser,
                validatedData,
            );

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith("new-token");
            expect(next).not.toHaveBeenCalled();
        });

        it("should return a 500 server error when the service throws", async () => {
            const validatedData = {
                current_password: "WrongPassword123!",
                new_password: "NewPassword123!",
            };

            const serviceError = new Error(
                "Current password does not match",
            );

            req.sanitize!.data = validatedData;
            mockPassword.mockRejectedValue(serviceError);

            await invokePassword();

            expect(req.credentials!.user).toHaveBeenCalledTimes(1);

            expect(mockPassword).toHaveBeenCalledWith(
                user,
                validatedData,
            );

            expectServerError(serviceError);
        });

        it("should return a 500 server error when credentials.user() rejects", async () => {
            const authenticationError = new Error(
                "Unable to resolve authenticated user",
            );

            req.credentials!.user.mockRejectedValue(authenticationError);

            await invokePassword();

            expect(req.credentials!.user).toHaveBeenCalledTimes(1);
            expect(mockPassword).not.toHaveBeenCalled();

            expectServerError(authenticationError);
        });

        it("should return 500 when credentials are missing", async () => {
            delete req.credentials;

            await invokePassword();

            expect(mockPassword).not.toHaveBeenCalled();

            expectServerError(expect.any(TypeError));
        });

        it("should return 500 when sanitize context is missing", async () => {
            delete req.sanitize;

            await invokePassword();

            expect(mockPassword).not.toHaveBeenCalled();

            expectServerError(expect.any(TypeError));
        });

        it("should pass undefined sanitized data to the service without performing validation", async () => {
            req.sanitize!.data = undefined;

            mockPassword.mockResolvedValue("token");

            await invokePassword();

            expect(mockPassword).toHaveBeenCalledWith(
                user,
                undefined,
            );

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith("token");
            expect(next).not.toHaveBeenCalled();
        });
    });
});
