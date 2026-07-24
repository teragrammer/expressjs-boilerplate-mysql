import {beforeEach, describe, expect, it, vi} from "vitest";
import {Request, Response} from "express";
import {
    TwoFactorAuthenticationController
} from "../../../../src/modules/auth/controllers/two-factor-authentication.controller";
import {AppError} from "../../../../src/common/utils/errors";
import {TwoFactorAuthenticationService} from "../../../../src/modules/auth/services/two-factor-authentication.service";
import {RequestSanitize} from "../../../../src/@types/express";

// 1. Declare ALL top-level stable mock data targets securely
const {mockSend, mockSettingInstance} = vi.hoisted(() => ({
    mockSend: vi.fn().mockResolvedValue([{statusCode: 202}, {}]),
    mockSettingInstance: {
        getCache: vi.fn().mockResolvedValue({
            pri: {
                tta_eml_snd: "no-reply@test.com",
                tta_eml_sbj: "Your Verification Code",
            },
        }),
    }
}));

// 2. Clear out infrastructure dependencies (Redis)
vi.mock("ioredis", () => {
    class MockRedis {
        on = vi.fn();
        get = vi.fn();
        set = vi.fn();
        del = vi.fn();
        ping = vi.fn().mockResolvedValue("PONG");

        duplicate() {
            return new MockRedis();
        }
    }

    return {default: MockRedis, Redis: MockRedis};
});

// 3. Setup Sendgrid Mock interfaces
vi.mock("@sendgrid/mail", () => {
    const mockMethods = {send: mockSend, setApiKey: vi.fn()};
    return {...mockMethods, default: mockMethods};
});

// 4. Mock the Isolated Container Instance Boundary instead of src/app
vi.mock("../../../../src/config/container", () => ({
    settingService: mockSettingInstance
}));

// 5. Suppress Logger noise
vi.mock("../../../config/logger", () => ({
    logger: {info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn()},
}));

describe("TwoFactorAuthenticationController Unit Tests", () => {
    let mockReq: Partial<Request> & { credentials?: Partial<RequestCredentials>; sanitize?: Partial<RequestSanitize> };
    let mockRes: Partial<Response>;
    let nextMock: any;
    let jsonMock: any;
    let statusMock: any;

    beforeEach(() => {
        vi.resetAllMocks();
        mockSend.mockResolvedValue([{statusCode: 202}, {}]);
        mockSettingInstance.getCache.mockResolvedValue({
            pri: {
                tta_eml_snd: "no-reply@test.com",
                tta_eml_sbj: "Your Verification Code",
            },
        });

        jsonMock = vi.fn();
        statusMock = vi.fn().mockReturnValue({json: jsonMock});
        nextMock = vi.fn();
        mockRes = {status: statusMock};

        mockReq = {
            credentials: {
                jwt: {uid: 1, tid: 100, tfa: false, eml: "user@example.com"},
                user: vi.fn().mockResolvedValue({id: 1, email: "user@example.com"}),
                authentication: vi.fn().mockResolvedValue({id: 100, token: "mocked-auth-token"}),
            },
            sanitize: {
                body: {
                    only: vi.fn().mockImplementation((keys: string[]) => {
                        if (keys.includes("code")) return {code: "123456"};
                        return {};
                    }),
                },
            } as any,
            ip: "127.0.0.1",
            useragent: {browser: "Chrome", os: "Linux"} as any,
        } as any;
    });

    async function executeController(method: Function, req: any, res: any, next: any) {
        try {
            const result = method(req, res, next);
            if (result && typeof result.then === "function") {
                await result;
            }
        } catch (err) {
            next(err);
        }
        await new Promise((resolve) => setImmediate(resolve));
        await new Promise(process.nextTick);
    }

    describe("send() workflow tests", () => {
        it("should forward a 403 AppError via next() if user session is already authenticated (tfa === true)", async () => {
            mockReq.credentials!.jwt.tfa = true;
            await executeController(TwoFactorAuthenticationController.send, mockReq, mockRes, nextMock);
            expect(nextMock).toHaveBeenCalledWith(
                new AppError("No OTP is necessary for this process", "OTP_NOT_NEEDED", 403)
            );
        });

        it("should forward a 403 AppError via next() if the JWT email parameter is empty or missing", async () => {
            mockReq.credentials!.jwt.eml = "   ";
            await executeController(TwoFactorAuthenticationController.send, mockReq, mockRes, nextMock);
            expect(nextMock).toHaveBeenCalledWith(
                new AppError("There is an issue with your email configuration", "UN_CONFIGURED_EMAIL", 403)
            );
        });

        it("should generate an OTP and respond with 200 status on success code generation", async () => {
            const workflowSpy = vi.spyOn(TwoFactorAuthenticationService.prototype, "sendOtpWorkflow")
                .mockResolvedValue({id: 50, nextTry: "2026-07-19T22:00:00.000Z", plainCode: "123456"});

            await executeController(TwoFactorAuthenticationController.send, mockReq, mockRes, nextMock);

            expect(workflowSpy).toHaveBeenCalledWith(100);
            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith({id: 50, next_try: "2026-07-19T22:00:00.000Z"});
            expect(nextMock).not.toHaveBeenCalled();
        });

        it("should catch email sender service failures and map it cleanly to a 500 AppError across environments", async () => {
            vi.spyOn(TwoFactorAuthenticationService.prototype, "sendOtpWorkflow")
                .mockResolvedValue({id: 50, nextTry: "2026-07-19T22:00:00.000Z", plainCode: "123456"});

            mockSend.mockRejectedValueOnce(new Error("SendGrid Unavailable"));

            await executeController(TwoFactorAuthenticationController.send, mockReq, mockRes, nextMock);

            expect(nextMock).toHaveBeenCalledWith(
                new AppError("There was an issue sending the email", "UNABLE_TO_SEND_EMAIL", 500)
            );
        });

        it("should forward internal service errors via next() if sendOtpWorkflow rejects", async () => {
            const serviceError = new AppError("Rate limit exceeded", "TOO_MANY_REQUESTS", 429);
            vi.spyOn(TwoFactorAuthenticationService.prototype, "sendOtpWorkflow")
                .mockRejectedValueOnce(serviceError);

            await executeController(TwoFactorAuthenticationController.send, mockReq, mockRes, nextMock);

            expect(nextMock).toHaveBeenCalledWith(serviceError);
            expect(statusMock).not.toHaveBeenCalled();
        });
    });

    describe("validate() verification tests", () => {
        it("should forward a 403 AppError via next() if the user has already cleared 2FA authentication requirements", async () => {
            mockReq.credentials!.jwt.tfa = true;
            await executeController(TwoFactorAuthenticationController.validate, mockReq, mockRes, nextMock);
            expect(nextMock).toHaveBeenCalledWith(
                new AppError("No OTP is necessary for this process", "OTP_NOT_NEEDED", 403)
            );
        });

        it("should forward a validation error via next() if Joi schema validation criteria fails due to missing body inputs", async () => {
            mockReq.sanitize!.body.only = vi.fn().mockReturnValue({});
            await executeController(TwoFactorAuthenticationController.validate, mockReq, mockRes, nextMock);
            expect(nextMock).toHaveBeenCalled();
            expect(nextMock.mock.calls[0][0]).toBeInstanceOf(Error);
        });

        it("should execute OTP workflow verify path and respond with the renewed token on matching code inputs", async () => {
            const verifySpy = vi.spyOn(TwoFactorAuthenticationService.prototype, "verifyOtpWorkflow")
                .mockResolvedValue("mocked-jwt-output-string");

            await executeController(TwoFactorAuthenticationController.validate, mockReq, mockRes, nextMock);

            expect(verifySpy).toHaveBeenCalledWith(100, "123456", expect.any(Object), {
                ip: "127.0.0.1", browser: "Chrome", os: "Linux",
            });
            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith({token: "mocked-jwt-output-string"});
            expect(nextMock).not.toHaveBeenCalled();
        });

        it("should forward verification failures via next() when an invalid or expired code is provided", async () => {
            const validationError = new AppError("Invalid verification code", "INVALID_CODE", 401);
            vi.spyOn(TwoFactorAuthenticationService.prototype, "verifyOtpWorkflow")
                .mockRejectedValueOnce(validationError);

            await executeController(TwoFactorAuthenticationController.validate, mockReq, mockRes, nextMock);

            expect(nextMock).toHaveBeenCalledWith(validationError);
            expect(statusMock).not.toHaveBeenCalled();
            expect(jsonMock).not.toHaveBeenCalled();
        });
    });
});