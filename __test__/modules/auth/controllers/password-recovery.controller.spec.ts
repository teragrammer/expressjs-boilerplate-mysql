import {beforeEach, describe, expect, it, vi} from "vitest";
import {Request, Response} from "express";
import {PasswordRecoveryService} from "../../../../src/modules/auth/services/password-recovery.service";
import {PasswordRecoveryController} from "../../../../src/modules/auth/controllers/password-recovery.controller";
import {AppError} from "../../../../src/common/utils/errors";

// Mock path matching your working relative import
vi.mock("../../../../src/modules/auth/services/password-recovery.service");

describe("PasswordRecoveryController Unit Tests", () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;

    beforeEach(() => {
        vi.clearAllMocks();

        mockRes = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis(),
        };
    });

    describe("send", () => {
        it("should validate email schema and trigger sendRecoveryCode successfully", async () => {
            const nextResendAt = new Date();
            vi.spyOn(PasswordRecoveryService.prototype, "sendRecoveryCode").mockResolvedValue({
                sent: true,
                nextResendAt,
            });

            mockReq = {
                sanitize: {
                    body: {
                        only: vi.fn().mockReturnValue({
                            type: "email",
                            send_to: "valid@example.com",
                        }),
                    },
                },
            } as unknown as Request;

            const mockNext = vi.fn();

            PasswordRecoveryController.send(mockReq as Request, mockRes as Response, mockNext);

            await vi.waitFor(() => {
                expect(mockRes.status).toHaveBeenCalledWith(200);
            });

            expect(PasswordRecoveryService.prototype.sendRecoveryCode).toHaveBeenCalledWith("email", "valid@example.com");
            expect(mockRes.json).toHaveBeenCalledWith({
                status: "success",
                message: "If an account matches those credentials, a reset code has been sent.",
                data: {next_resend_at: nextResendAt},
            });
        });

        it("should validate phone schema and trigger sendRecoveryCode successfully", async () => {
            vi.spyOn(PasswordRecoveryService.prototype, "sendRecoveryCode").mockResolvedValue({
                sent: true,
                nextResendAt: undefined,
            });

            mockReq = {
                sanitize: {
                    body: {
                        only: vi.fn().mockReturnValue({
                            type: "phone",
                            send_to: "+14155552671", // Standard E.164 phone string
                        }),
                    },
                },
            } as unknown as Request;

            const mockNext = vi.fn();

            PasswordRecoveryController.send(mockReq as Request, mockRes as Response, mockNext);

            await vi.waitFor(() => {
                expect(mockRes.status).toHaveBeenCalledWith(200);
            });

            expect(PasswordRecoveryService.prototype.sendRecoveryCode).toHaveBeenCalledWith("phone", "+14155552671");
            expect(mockRes.json).toHaveBeenCalledWith({
                status: "success",
                message: "If an account matches those credentials, a reset code has been sent.",
                data: null,
            });
        });

        it("should reject payload failing Joi validation schema (invalid email)", async () => {
            mockReq = {
                sanitize: {
                    body: {
                        only: vi.fn().mockReturnValue({
                            type: "email",
                            send_to: "not-an-email",
                        }),
                    },
                },
            } as unknown as Request;

            const mockNext = vi.fn();

            PasswordRecoveryController.send(mockReq as Request, mockRes as Response, mockNext);

            await vi.waitFor(() => {
                expect(mockNext).toHaveBeenCalledWith(expect.anything());
            });
        });

        it("should pass AppError to next() if service throws an error (e.g. rate limit)", async () => {
            const error = new AppError("Rate limit", "TRY_RESEND", 429);
            vi.spyOn(PasswordRecoveryService.prototype, "sendRecoveryCode").mockRejectedValue(error);

            mockReq = {
                sanitize: {
                    body: {
                        only: vi.fn().mockReturnValue({
                            type: "email",
                            send_to: "valid@example.com",
                        }),
                    },
                },
            } as unknown as Request;

            const mockNext = vi.fn();

            PasswordRecoveryController.send(mockReq as Request, mockRes as Response, mockNext);

            await vi.waitFor(() => {
                expect(mockNext).toHaveBeenCalledWith(error);
            });
        });
    });

    describe("validate", () => {
        it("should validate request body and invoke resetPassword", async () => {
            vi.spyOn(PasswordRecoveryService.prototype, "resetPassword").mockResolvedValue(true);

            mockReq = {
                sanitize: {
                    body: {
                        only: vi.fn().mockReturnValue({
                            type: "email",
                            send_to: "valid@example.com",
                            code: "123456",
                            new_password: "SecurePassword123",
                        }),
                    },
                },
            } as unknown as Request;

            const mockNext = vi.fn();

            PasswordRecoveryController.validate(mockReq as Request, mockRes as Response, mockNext);

            await vi.waitFor(() => {
                expect(mockRes.status).toHaveBeenCalledWith(200);
            });

            expect(PasswordRecoveryService.prototype.resetPassword).toHaveBeenCalledWith(
                "email",
                "valid@example.com",
                "123456",
                "SecurePassword123"
            );
            expect(mockRes.json).toHaveBeenCalledWith({
                status: "success",
                message: "Password has been successfully reset. You can now log in with your new password.",
            });
        });

        it("should fail validation if code length is not 6 characters", async () => {
            mockReq = {
                sanitize: {
                    body: {
                        only: vi.fn().mockReturnValue({
                            type: "email",
                            send_to: "valid@example.com",
                            code: "123", // Too short
                            new_password: "SecurePassword123",
                        }),
                    },
                },
            } as unknown as Request;

            const mockNext = vi.fn();

            PasswordRecoveryController.validate(mockReq as Request, mockRes as Response, mockNext);

            await vi.waitFor(() => {
                expect(mockNext).toHaveBeenCalledWith(expect.anything());
            });

            expect(PasswordRecoveryService.prototype.resetPassword).not.toHaveBeenCalled();
        });

        it("should fail validation if new_password is under 8 characters", async () => {
            mockReq = {
                sanitize: {
                    body: {
                        only: vi.fn().mockReturnValue({
                            type: "email",
                            send_to: "valid@example.com",
                            code: "123456",
                            new_password: "short", // Fails .min(8)
                        }),
                    },
                },
            } as unknown as Request;

            const mockNext = vi.fn();

            PasswordRecoveryController.validate(mockReq as Request, mockRes as Response, mockNext);

            await vi.waitFor(() => {
                expect(mockNext).toHaveBeenCalledWith(expect.anything());
            });
        });

        it("should pass AppError to next() if service rejects the reset (e.g. invalid code)", async () => {
            const error = new AppError("Invalid recovery code.", "INVALID_CODE", 400);
            vi.spyOn(PasswordRecoveryService.prototype, "resetPassword").mockRejectedValue(error);

            mockReq = {
                sanitize: {
                    body: {
                        only: vi.fn().mockReturnValue({
                            type: "email",
                            send_to: "valid@example.com",
                            code: "123456",
                            new_password: "SecurePassword123",
                        }),
                    },
                },
            } as unknown as Request;

            const mockNext = vi.fn();

            PasswordRecoveryController.validate(mockReq as Request, mockRes as Response, mockNext);

            await vi.waitFor(() => {
                expect(mockNext).toHaveBeenCalledWith(error);
            });
        });
    });
});