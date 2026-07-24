// __test__/modules/auth/services/password-recovery.service.spec.ts

import {beforeEach, describe, expect, it, vi} from "vitest";
import {PasswordRecoveryService} from "../../../../src/modules/auth/services/password-recovery.service";
import {SecurityUtil} from "../../../../src/common/utils/security.util";
import {PasswordRecoveryRepository} from "../../../../src/modules/auth/repositories/password-recovery.repository";
import {UserRepository} from "../../../../src/modules/users/user.repository";
import {RECOVERY_EMAIL, RECOVERY_PHONE} from "../../../../src/modules/auth/interfaces/password.recovery.interface";
import {AppError} from "../../../../src/common/utils/errors";

describe("PasswordRecoveryService Unit Tests", () => {
    let service: PasswordRecoveryService;
    let mockSecurityUtil: SecurityUtil;
    let mockRecoveryRepo: PasswordRecoveryRepository;
    let mockUserRepo: UserRepository;

    beforeEach(() => {
        mockSecurityUtil = {
            randomNumber: vi.fn().mockReturnValue("123456"),
            hash: vi.fn().mockResolvedValue("hashed_code"),
            compare: vi.fn(),
        } as unknown as SecurityUtil;

        mockRecoveryRepo = {
            findBySendTo: vi.fn(),
            upsertRecovery: vi.fn(),
            updateTries: vi.fn(),
            deleteBySendTo: vi.fn(),
        } as unknown as PasswordRecoveryRepository;

        mockUserRepo = {
            findByEmail: vi.fn(),
            findByPhone: vi.fn(),
            update: vi.fn(),
        } as unknown as UserRepository;

        service = new PasswordRecoveryService(mockSecurityUtil, mockRecoveryRepo, mockUserRepo);
    });

    describe("sendRecoveryCode", () => {
        it("should return { sent: true } without sending code if user does not exist (Anti-User Enumeration)", async () => {
            vi.mocked(mockUserRepo.findByEmail).mockResolvedValue(null);

            const result = await service.sendRecoveryCode(RECOVERY_EMAIL, "unknown@example.com");

            expect(mockUserRepo.findByEmail).toHaveBeenCalledWith("unknown@example.com");
            expect(mockRecoveryRepo.findBySendTo).not.toHaveBeenCalled();
            expect(result).toEqual({sent: true});
        });

        it("should throw AppError 429 if request is made within resend cooldown", async () => {
            vi.mocked(mockUserRepo.findByPhone).mockResolvedValue({id: 1} as any);
            vi.mocked(mockRecoveryRepo.findBySendTo).mockResolvedValue({
                next_resend_at: new Date(Date.now() + 60000), // 1 minute in future
            } as any);

            await expect(service.sendRecoveryCode(RECOVERY_PHONE, "1234567890")).rejects.toThrow(AppError);
            await expect(service.sendRecoveryCode(RECOVERY_PHONE, "1234567890")).rejects.toMatchObject({
                statusCode: 429,
            });
        });

        it("should generate hashed code and upsert recovery session successfully", async () => {
            vi.mocked(mockUserRepo.findByEmail).mockResolvedValue({id: 1} as any);
            vi.mocked(mockRecoveryRepo.findBySendTo).mockResolvedValue(null);

            const result = await service.sendRecoveryCode(RECOVERY_EMAIL, "user@example.com");

            expect(mockSecurityUtil.randomNumber).toHaveBeenCalledWith(6);
            expect(mockSecurityUtil.hash).toHaveBeenCalledWith("123456");
            expect(mockRecoveryRepo.upsertRecovery).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: RECOVERY_EMAIL,
                    send_to: "user@example.com",
                    code: "hashed_code",
                    tries: 0,
                    next_try_at: null,
                })
            );
            expect(result.sent).toBe(true);
            expect(result.nextResendAt).toBeInstanceOf(Date);
        });
    });

    describe("resetPassword", () => {
        it("should throw AppError if no recovery record exists", async () => {
            vi.mocked(mockRecoveryRepo.findBySendTo).mockResolvedValue(null);

            await expect(service.resetPassword(RECOVERY_EMAIL, "user@example.com", "123456", "newPass123")).rejects.toMatchObject({
                statusCode: 400,
                errorCode: "INVALID_TOKEN",
            });
        });

        it("should delete record and throw AppError if recovery code has expired", async () => {
            vi.mocked(mockRecoveryRepo.findBySendTo).mockResolvedValue({
                expired_at: new Date(Date.now() - 60000), // Expired 1 min ago
            } as any);

            await expect(service.resetPassword(RECOVERY_EMAIL, "user@example.com", "123456", "newPass123")).rejects.toMatchObject({
                statusCode: 400,
                errorCode: "EXPIRED_TOKEN",
            });
            expect(mockRecoveryRepo.deleteBySendTo).toHaveBeenCalledWith("user@example.com");
        });

        it("should throw AppError 429 if user is currently locked out by next_try_at", async () => {
            vi.mocked(mockRecoveryRepo.findBySendTo).mockResolvedValue({
                expired_at: new Date(Date.now() + 600000),
                next_try_at: new Date(Date.now() + 60000), // Lockout active
            } as any);

            await expect(service.resetPassword(RECOVERY_EMAIL, "user@example.com", "123456", "newPass123")).rejects.toMatchObject({
                statusCode: 429,
                errorCode: "TOO_MANY_ATTEMPTS",
            });
        });

        it("should increment tries on code mismatch and enforce lockout when reaching MAX_TRIES", async () => {
            vi.mocked(mockRecoveryRepo.findBySendTo).mockResolvedValue({
                id: 99,
                expired_at: new Date(Date.now() + 600000),
                next_try_at: null,
                code: "hashed_correct_code",
                tries: 4, // 4th attempt -> next failure becomes 5th (MAX_TRIES)
            } as any);
            vi.mocked(mockSecurityUtil.compare).mockResolvedValue(false);

            await expect(service.resetPassword(RECOVERY_EMAIL, "user@example.com", "wrong_code", "newPass123")).rejects.toMatchObject({
                statusCode: 400,
                errorCode: "INVALID_CODE",
            });

            expect(mockRecoveryRepo.updateTries).toHaveBeenCalledWith(
                99,
                0, // Reset counter after locking out
                expect.any(Date) // nextTryAt set
            );
        });

        it("should throw 404 if user account is not found during final step", async () => {
            vi.mocked(mockRecoveryRepo.findBySendTo).mockResolvedValue({
                id: 99,
                expired_at: new Date(Date.now() + 600000),
                code: "hashed_code",
                tries: 0,
            } as any);
            vi.mocked(mockSecurityUtil.compare).mockResolvedValue(true);
            vi.mocked(mockUserRepo.findByEmail).mockResolvedValue(null);

            await expect(service.resetPassword(RECOVERY_EMAIL, "user@example.com", "123456", "newPass123")).rejects.toMatchObject({
                statusCode: 404,
                errorCode: "USER_NOT_FOUND",
            });
        });

        it("should reset password successfully and invalidate recovery session", async () => {
            vi.mocked(mockRecoveryRepo.findBySendTo).mockResolvedValue({
                id: 99,
                expired_at: new Date(Date.now() + 600000),
                code: "hashed_code",
                tries: 0,
            } as any);
            vi.mocked(mockSecurityUtil.compare).mockResolvedValue(true);
            vi.mocked(mockUserRepo.findByEmail).mockResolvedValue({id: 10} as any);
            vi.mocked(mockSecurityUtil.hash).mockResolvedValue("hashed_new_password");

            const success = await service.resetPassword(RECOVERY_EMAIL, "user@example.com", "123456", "newPass123");

            expect(mockSecurityUtil.hash).toHaveBeenCalledWith("newPass123");
            expect(mockUserRepo.update).toHaveBeenCalledWith(10, {password: "hashed_new_password"});
            expect(mockRecoveryRepo.deleteBySendTo).toHaveBeenCalledWith("user@example.com");
            expect(success).toBe(true);
        });
    });
});