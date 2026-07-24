// src/modules/auth/controllers/password-recovery.controller.ts

import {Request, Response} from "express";
import catchAsync from "../../../common/utils/catch-async";
import Joi from "../../../shared/validations";
import {PasswordRecoveryService} from "../services/password-recovery.service";
import {RECOVERY_EMAIL, TYPES} from "../interfaces/password.recovery.interface";
import {SecurityUtil} from "../../../common/utils/security.util";
import {__ENV} from "../../../config/environment";

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
        const schema = Joi.object({
            type: Joi.string().valid(...TYPES).required(),
            send_to: Joi.string().required().when("type", {
                is: RECOVERY_EMAIL,
                then: Joi.string().email().max(100),
                otherwise: Joi.string().min(1).max(18).phone(),
            }),
        });

        const validatedData = await schema.validateAsync(rawData, {abortEarly: false});

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

        const schema = Joi.object({
            type: Joi.string().valid(...TYPES).required(),
            send_to: Joi.string().required().when("type", {
                is: RECOVERY_EMAIL,
                then: Joi.string().email().max(100),
                otherwise: Joi.string().min(1).max(18).phone(),
            }),
            code: Joi.string().length(6).required(),
            new_password: Joi.string().min(8).max(100).required(),
        });

        const validatedData = await schema.validateAsync(rawData, {abortEarly: false});

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