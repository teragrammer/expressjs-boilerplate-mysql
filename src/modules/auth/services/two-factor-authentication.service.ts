// src/modules/auth/services/two-factor-authentication.service.ts

import {TwoFactorAuthenticationRepository} from "../repositories/two-factor-authentication.repository";
import {SecurityUtil} from "../../../common/utils/security.util";
import {DateUtil} from "../../../common/utils/date.util";
import {AppError} from "../../../common/utils/errors";
import Messages from "../../../common/utils/messages";
import {TokenService} from "./auth-token.service";
import {AuthenticationTokenRepository} from "../repositories/authentication-token.repository";

export class TwoFactorAuthenticationService {
    constructor(
        private readonly securityUtil: SecurityUtil,
        private readonly tfaRepository = new TwoFactorAuthenticationRepository(),
        private readonly authenticationTokenRepository = new AuthenticationTokenRepository(),
        private readonly authTokenService = new TokenService(),
        private readonly dateUtil = DateUtil
    ) {
    }

    public static isEmailEmpty(email?: string): boolean {
        return !email || email.trim() === "";
    }

    async sendOtpWorkflow(tokenId: number): Promise<{ id: number; nextTry: string; plainCode: string }> {
        const tfa = await this.tfaRepository.findByTokenId(tokenId);

        const nextTryDate = this.dateUtil.expiredAt(2, "minutes");
        // Convert it to a string format matching your interface requirements
        const nextTry = nextTryDate instanceof Date ? nextTryDate.toISOString() : String(nextTryDate);
        const plainCode = String(this.securityUtil.randomNumber());
        const hashedCode = await this.securityUtil.hash(plainCode);
        const expiredAt = this.dateUtil.expiredAt(5, "minutes");

        let tfaId: number;

        if (!tfa) {
            // Flow A: First-time generation
            const newTfa = await this.tfaRepository.create({
                token_id: tokenId,
                code: hashedCode,
                expired_at: expiredAt,
                next_send_at: nextTry,
                created_at: this.dateUtil.sql(),
            });
            tfaId = newTfa.id;
        } else {
            // Flow B: Handling existing OTP context & checking rate limits
            if (tfa.next_send_at !== null) {
                const currentTime = this.dateUtil.unix();
                const nextSendAt = this.dateUtil.unix(new Date(tfa.next_send_at));

                if (currentTime < nextSendAt) {
                    throw new AppError(
                        "Cannot resend OTP yet. Please wait.",
                        Messages.RESEND_OTP_NOT_POSSIBLE?.code || "RESEND_OTP_NOT_POSSIBLE",
                        403
                    );
                }
            }

            await this.tfaRepository.update(tfa.id, {
                code: hashedCode,
                expired_at: expiredAt,
                next_send_at: nextTry,
            });
            tfaId = tfa.id;
        }

        return {id: tfaId, nextTry, plainCode};
    }

    async verifyOtpWorkflow(
        tokenId: number,
        inputCode: string,
        user: any,
        meta: { ip: string | null; browser: string | null; os: string | null }
    ): Promise<string> {
        const tfa = await this.tfaRepository.findByTokenId(tokenId);

        // Check if record exists
        if (!tfa) {
            throw new AppError(
                Messages.DATA_NOT_FOUND?.message || "Data not found.",
                Messages.DATA_NOT_FOUND?.code || "DATA_NOT_FOUND",
                404
            );
        }

        // Check for missing expiration configurations
        if (!tfa.expired_at) {
            throw new AppError(
                Messages.UN_CONFIGURED_EXPIRATION?.message || "Unconfigured expiration date.",
                Messages.UN_CONFIGURED_EXPIRATION?.code || "UN_CONFIGURED_EXPIRATION",
                404
            );
        }

        const currentTime = this.dateUtil.unix();

        // Code expiration check (HTTP 419 replacement match)
        const expiredAt = this.dateUtil.unix(new Date(tfa.expired_at));
        if (currentTime > expiredAt) {
            throw new AppError(
                "The verification session has expired.",
                Messages.RESOURCE_EXPIRED?.code || "RESOURCE_EXPIRED",
                419
            );
        }

        // Rate-limit Lockout validation check
        if (tfa.expired_tries_at) {
            const expiredTriesAt = this.dateUtil.unix(new Date(tfa.expired_tries_at));

            if (expiredTriesAt > currentTime) {
                throw new AppError(
                    Messages.TOO_MANY_ATTEMPT?.message || "Too many attempts.",
                    Messages.TOO_MANY_ATTEMPT?.code || "TOO_MANY_ATTEMPT",
                    403
                );
            }

            // Lockout time passed: reset structural limits natively via repository
            await this.tfaRepository.resetTries(tfa.id);
            tfa.tries = 0;
        }

        // Hard ceiling check on excessive failed tires
        if (tfa.tries > 5) {
            throw new AppError(
                Messages.TOO_MANY_ATTEMPT?.message || "Too many attempts.",
                Messages.TOO_MANY_ATTEMPT?.code || "TOO_MANY_ATTEMPT",
                403
            );
        }

        // Verify cryptographic code matching state
        const isCodeMatch = await this.securityUtil.compare(tfa.code, inputCode);

        if (!isCodeMatch) {
            await this.tfaRepository.incrementTries(tfa.id);

            throw new AppError(
                Messages.OTP_NO_MATCH?.message || "Invalid code.",
                Messages.OTP_NO_MATCH?.code || "OTP_NO_MATCH",
                400
            );
        }

        // Success Step: Consume the OTP session by deleting it entirely
        await this.tfaRepository.deleteById(tfa.id);

        // purge expired tokens
        await this.authenticationTokenRepository.purgeExpiredTokensByUserId(user.id);

        // Regenerate final authorized application JWT
        // Swap this logic with your token generation service matching your Register/Login flow
        const TFA_CLEARED = true;
        return this.authTokenService.generateToken({
            uid: user.id,
            tid: tokenId, // Pass old token id, or create a brand new DB token row if preferred
            tfa: TFA_CLEARED,
        });
    }
}