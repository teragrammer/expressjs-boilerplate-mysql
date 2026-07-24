// src/modules/auth/services/password-recovery.service.ts

import {UserRepository} from "../../users/user.repository";
import {PasswordRecoveryRepository} from "../repositories/password-recovery.repository";
import {RECOVERY_EMAIL, RECOVERY_PHONE, Type} from "../interfaces/password.recovery.interface";
import {SecurityUtil} from "../../../common/utils/security.util";
import {AppError} from "../../../common/utils/errors";
import {__ENV} from "../../../config/environment";
import messages from "../../../common/utils/messages";

const CODE_LENGTH = 6;
const NEXT_RESEND_MINUTES = 2;
const CODE_EXPIRATION_MINUTES = 30;

const MAX_TRIES = 5;
const NEXT_TRY_MINUTES = 3;

// Default utility instance if none injected
const defaultSecurityUtil = new SecurityUtil({
    bcryptSecret: __ENV.BCRYPT_SECRET,
    bcryptSaltRounds: Number(__ENV.BCRYPT_SALT_ROUND || 10),
});

export class PasswordRecoveryService {
    constructor(
        private securityUtil: SecurityUtil = defaultSecurityUtil,
        private recoveryRepo = new PasswordRecoveryRepository(),
        private userRepo = new UserRepository()
    ) {
    }

    /**
     * Sends password recovery code (Email or SMS).
     * Prevents User Enumeration by returning successfully even if the user does not exist.
     */
    async sendRecoveryCode(type: Type, sendTo: string): Promise<{ sent: boolean; nextResendAt?: Date }> {
        // 1. Verify if user exists
        const user = type === RECOVERY_EMAIL
            ? await this.userRepo.findByEmail(sendTo)
            : await this.userRepo.findByPhone(sendTo);

        // Anti-User Enumeration: Return success silently if user does not exist
        if (!user) {
            return {sent: true};
        }

        // 2. Check rate limit resend cooldown
        const existingRecord = await this.recoveryRepo.findBySendTo(sendTo);
        const now = new Date();

        if (existingRecord && new Date(existingRecord.next_resend_at) > now) {
            throw new AppError(
                "Please wait before requesting another recovery code.",
                messages.TRY_RESEND.code,
                429
            );
        }

        // 3. Generate uniform random numeric code & hash it via SecurityUtil
        const rawCode = this.securityUtil.randomNumber(CODE_LENGTH);
        const hashCode = await this.securityUtil.hash(rawCode);

        const nextResendAt = new Date(now.getTime() + NEXT_RESEND_MINUTES * 60 * 1000);
        const expiredAt = new Date(now.getTime() + CODE_EXPIRATION_MINUTES * 60 * 1000);

        // 4. Save record to DB (resets tries and next_try_at on new request)
        await this.recoveryRepo.upsertRecovery({
            type,
            send_to: sendTo,
            code: hashCode,
            next_resend_at: nextResendAt,
            expired_at: expiredAt,
            tries: 0,
            next_try_at: null,
        });

        // 5. Trigger notification transport
        if (type === RECOVERY_EMAIL) {
            // TODO: Dispatch Email notification (e.g. await mailer.sendResetCode(sendTo, rawCode))
        } else if (type === RECOVERY_PHONE) {
            // TODO: Dispatch SMS notification (e.g. await sms.sendResetCode(sendTo, rawCode))
        }

        return {sent: true, nextResendAt};
    }

    /**
     * Validates recovery code and updates password upon success.
     */
    async resetPassword(type: Type, sendTo: string, code: string, newPassword: string): Promise<boolean> {
        const record = await this.recoveryRepo.findBySendTo(sendTo);
        const now = new Date();

        if (!record) {
            throw new AppError("Invalid or expired recovery session.", "INVALID_TOKEN", 400);
        }

        // 1. Check code expiration
        if (new Date(record.expired_at) < now) {
            await this.recoveryRepo.deleteBySendTo(sendTo);
            throw new AppError("Recovery code has expired. Please request a new one.", "EXPIRED_TOKEN", 400);
        }

        // 2. Check lockout cool-down due to excessive failed attempts
        if (record.next_try_at && new Date(record.next_try_at) > now) {
            throw new AppError(
                "Too many failed attempts. Please wait a few minutes before trying again.",
                "TOO_MANY_ATTEMPTS",
                429
            );
        }

        // 3. Compare code via SecurityUtil (hashed, plain)
        const isMatch = await this.securityUtil.compare(record.code, code);

        if (!isMatch) {
            let currentTries = record.tries + 1;
            let nextTryAt: Date | null = null;

            // Lock user out if MAX_TRIES reached and reset counter for next attempt cycle
            if (currentTries >= MAX_TRIES) {
                nextTryAt = new Date(now.getTime() + NEXT_TRY_MINUTES * 60 * 1000);
                currentTries = 0; // Reset counter after lockout window is imposed
            }

            await this.recoveryRepo.updateTries(record.id, currentTries, nextTryAt);
            throw new AppError("Invalid recovery code.", "INVALID_CODE", 400);
        }

        // 4. Code valid -> Fetch User and hash new password via SecurityUtil
        const user = type === RECOVERY_EMAIL
            ? await this.userRepo.findByEmail(sendTo)
            : await this.userRepo.findByPhone(sendTo);

        if (!user) {
            throw new AppError("User account no longer exists.", "USER_NOT_FOUND", 404);
        }

        const hashedPassword = await this.securityUtil.hash(newPassword);
        await this.userRepo.update(user.id, {password: hashedPassword});

        // 5. Invalidate Recovery Session
        await this.recoveryRepo.deleteBySendTo(sendTo);

        return true;
    }
}