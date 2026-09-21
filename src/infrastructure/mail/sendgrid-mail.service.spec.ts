import {beforeEach, describe, expect, it, vi} from "vitest";
import sgMail from "@sendgrid/mail";

import {SendGridMailService} from "./sendgrid-mail.service";
import {logger} from "../../config/logger";
import {AppError} from "../../common/utils/errors";
import Messages from "../../common/utils/messages";
import {SendMailInput} from "../../common/interfaces/mail.interface";

vi.mock("@sendgrid/mail", () => ({
    default: {
        setApiKey: vi.fn(),
        send: vi.fn(),
    },
}));

vi.mock("../../config/logger", () => ({
    logger: {
        error: vi.fn(),
    },
}));

describe("SendGridMailService", () => {
    let service: SendGridMailService;

    const mockSetApiKey = vi.mocked(sgMail.setApiKey);
    const mockSend = vi.mocked(sgMail.send);
    const mockLoggerError = vi.mocked(logger.error);

    const baseInput: SendMailInput = {
        to: "recipient@example.com",
        from: "sender@example.com",
        subject: "Test email",
        text: "Hello from the test",
    };

    beforeEach(() => {
        vi.clearAllMocks();

        service = new SendGridMailService("test-api-key");
    });

    describe("constructor", () => {
        it("should configure SendGrid with the provided API key", () => {
            expect(mockSetApiKey).toHaveBeenCalledTimes(1);
            expect(mockSetApiKey).toHaveBeenCalledWith("test-api-key");
        });
    });

    describe("send", () => {
        it("should send an email successfully", async () => {
            mockSend.mockResolvedValueOnce([] as never);

            await expect(service.send(baseInput)).resolves.toBeUndefined();

            expect(mockSend).toHaveBeenCalledTimes(1);
            expect(mockSend).toHaveBeenCalledWith({
                to: "recipient@example.com",
                from: "sender@example.com",
                subject: "Test email",
                text: "Hello from the test",
            });

            expect(mockLoggerError).not.toHaveBeenCalled();
        });

        it("should support multiple recipients", async () => {
            mockSend.mockResolvedValueOnce([] as never);

            const input: SendMailInput = {
                ...baseInput,
                to: [
                    "first@example.com",
                    "second@example.com",
                ],
            };

            await expect(service.send(input)).resolves.toBeUndefined();

            expect(mockSend).toHaveBeenCalledWith({
                to: [
                    "first@example.com",
                    "second@example.com",
                ],
                from: "sender@example.com",
                subject: "Test email",
                text: "Hello from the test",
            });
        });

        it("should include html when html is provided", async () => {
            mockSend.mockResolvedValueOnce([] as never);

            const input: SendMailInput = {
                ...baseInput,
                html: "<h1>Hello</h1>",
            };

            await expect(service.send(input)).resolves.toBeUndefined();

            expect(mockSend).toHaveBeenCalledWith({
                to: "recipient@example.com",
                from: "sender@example.com",
                subject: "Test email",
                text: "Hello from the test",
                html: "<h1>Hello</h1>",
            });
        });

        it("should omit html when html is undefined", async () => {
            mockSend.mockResolvedValueOnce([] as never);

            const input: SendMailInput = {
                ...baseInput,
                html: undefined,
            };

            await service.send(input);

            expect(mockSend).toHaveBeenCalledWith({
                to: "recipient@example.com",
                from: "sender@example.com",
                subject: "Test email",
                text: "Hello from the test",
            });
        });

        it("should use an empty string when text is undefined", async () => {
            mockSend.mockResolvedValueOnce([] as never);

            const input: SendMailInput = {
                to: "recipient@example.com",
                from: "sender@example.com",
                subject: "Test email",
            };

            await expect(service.send(input)).resolves.toBeUndefined();

            expect(mockSend).toHaveBeenCalledWith({
                to: "recipient@example.com",
                from: "sender@example.com",
                subject: "Test email",
                text: "",
            });
        });

        it("should preserve an explicitly provided empty text value", async () => {
            mockSend.mockResolvedValueOnce([] as never);

            const input: SendMailInput = {
                ...baseInput,
                text: "",
            };

            await service.send(input);

            expect(mockSend).toHaveBeenCalledWith({
                to: "recipient@example.com",
                from: "sender@example.com",
                subject: "Test email",
                text: "",
            });
        });

        it("should preserve an explicitly provided empty html value", async () => {
            mockSend.mockResolvedValueOnce([] as never);

            const input: SendMailInput = {
                ...baseInput,
                html: "",
            };

            await service.send(input);

            expect(mockSend).toHaveBeenCalledWith({
                to: "recipient@example.com",
                from: "sender@example.com",
                subject: "Test email",
                text: "Hello from the test",
                html: "",
            });
        });

        describe("when SendGrid throws an Error", () => {
            it("should log the original error message", async () => {
                const error = new Error("SendGrid request failed");

                mockSend.mockRejectedValueOnce(error);

                await expect(service.send(baseInput)).rejects.toBeInstanceOf(
                    AppError,
                );

                expect(mockLoggerError).toHaveBeenCalledTimes(1);
                expect(mockLoggerError).toHaveBeenCalledWith(
                    {
                        error: "SendGrid request failed",
                    },
                    "Failed to send email",
                );
            });

            it("should throw an AppError with the expected error metadata", async () => {
                mockSend.mockRejectedValueOnce(
                    new Error("SendGrid request failed"),
                );

                await expect(service.send(baseInput)).rejects.toMatchObject({
                    message: Messages.UNABLE_TO_SEND_EMAIL.message,
                    errorCode: Messages.UNABLE_TO_SEND_EMAIL.code,
                    statusCode: Messages.UNABLE_TO_SEND_EMAIL.status,
                });
            });

            it("should not rethrow the original error", async () => {
                const originalError = new Error("SendGrid request failed");

                mockSend.mockRejectedValueOnce(originalError);

                try {
                    await service.send(baseInput);
                    throw new Error("Expected service.send() to reject");
                } catch (error) {
                    expect(error).toBeInstanceOf(AppError);
                    expect(error).not.toBe(originalError);
                }
            });
        });

        describe("when SendGrid rejects with a non-Error value", () => {
            it("should use the unknown email delivery error message", async () => {
                mockSend.mockRejectedValueOnce("SendGrid failed");

                await expect(service.send(baseInput)).rejects.toBeInstanceOf(
                    AppError,
                );

                expect(mockLoggerError).toHaveBeenCalledTimes(1);
                expect(mockLoggerError).toHaveBeenCalledWith(
                    {
                        error: "Unknown email delivery error",
                    },
                    "Failed to send email",
                );
            });

            it("should handle null as the rejection value", async () => {
                mockSend.mockRejectedValueOnce(null);

                await expect(service.send(baseInput)).rejects.toBeInstanceOf(
                    AppError,
                );

                expect(mockLoggerError).toHaveBeenCalledWith(
                    {
                        error: "Unknown email delivery error",
                    },
                    "Failed to send email",
                );
            });

            it("should handle undefined as the rejection value", async () => {
                mockSend.mockRejectedValueOnce(undefined);

                await expect(service.send(baseInput)).rejects.toBeInstanceOf(
                    AppError,
                );

                expect(mockLoggerError).toHaveBeenCalledWith(
                    {
                        error: "Unknown email delivery error",
                    },
                    "Failed to send email",
                );
            });
        });

        it("should not log an error when sending succeeds", async () => {
            mockSend.mockResolvedValueOnce([] as never);

            await service.send(baseInput);

            expect(mockLoggerError).not.toHaveBeenCalled();
        });

        it("should call SendGrid exactly once", async () => {
            mockSend.mockResolvedValueOnce([] as never);

            await service.send(baseInput);

            expect(mockSend).toHaveBeenCalledTimes(1);
        });
    });
});
