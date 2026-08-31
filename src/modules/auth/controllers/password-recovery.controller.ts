// src/modules/auth/controllers/password-recovery.controller.ts

import {Request, Response} from "express";
import catchAsync from "../../../common/utils/catch-async";
import {PasswordRecoveryService} from "../services/password-recovery.service";
import {SecurityUtil} from "../../../common/utils/security.util";
import {__ENV} from "../../../config/environment";
import {passwordRecoverySendSchema} from "../validations/password-recovery-send.schema";
import {passwordRecoveryValidateSchema} from "../validations/password-recovery-validate.schema";

const securityUtil = new SecurityUtil({
    bcryptSecret: __ENV.BCRYPT_SECRET,
    bcryptSaltRounds: Number(__ENV.BCRYPT_SALT_ROUND || 10)
});

// Single service instance shared across controller methods
const recoveryService = new PasswordRecoveryService(securityUtil);

export class PasswordRecoveryController {
    /**
     * Send OTP / Verification Code
     */
    static send = catchAsync(async (req: Request, res: Response): Promise<Response> => {
        // Sanitize body payload
        const rawData = req.sanitize.body.only(["type", "send_to"]);

        // Validate payload structure with conditional email/phone checks
        const validatedData = await passwordRecoverySendSchema.validateAsync(rawData, {abortEarly: false});

        const result = await recoveryService.sendRecoveryCode(
            validatedData.type,
            validatedData.send_to
        );

        return res.status(200).json({
            status: "success",
            message: "If an account matches those credentials, a reset code has been sent.",
            data: result.nextResendAt ? {next_resend_at: result.nextResendAt} : null,
        });
    });

    /**
     * Validate OTP Code and Reset Password
     */
    static validate = catchAsync(async (req: Request, res: Response): Promise<Response> => {
        // Sanitize body payload
        const rawData = req.sanitize.body.only(["type", "send_to", "code", "new_password"]);

        const validatedData = await passwordRecoveryValidateSchema.validateAsync(rawData, {abortEarly: false});

        await recoveryService.resetPassword(
            validatedData.type,
            validatedData.send_to,
            validatedData.code,
            validatedData.new_password
        );

        return res.status(200).json({
            status: "success",
            message: "Password has been successfully reset. You can now log in with your new password.",
        });
    });
}