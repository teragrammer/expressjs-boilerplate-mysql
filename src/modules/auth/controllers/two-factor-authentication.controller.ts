// src/modules/auth/controllers/two-factor-authentication.controller.ts

import catchAsync from "../../../common/utils/catch-async";
import {Request, Response} from "express";
import {TwoFactorAuthenticationService} from "../services/two-factor-authentication.service";
import {AppError} from "../../../common/utils/errors";
import Messages from "../../../common/utils/messages";
import {settingService} from "../../../config/container";
import sgMail from "@sendgrid/mail";
import {logger} from "../../../config/logger";
import {SecurityUtil} from "../../../common/utils/security.util";
import {__ENV} from "../../../config/environment";
import Joi from "../../../shared/validations";

const securityUtil = new SecurityUtil({
    bcryptSecret: __ENV.BCRYPT_SECRET,
    bcryptSaltRounds: Number(__ENV.BCRYPT_SALT_ROUND || 10)
});

const tfaService = new TwoFactorAuthenticationService(securityUtil);

export class TwoFactorAuthenticationController {
    static send = catchAsync(async (req: Request, res: Response): Promise<void> => {
        const {jwt} = req.credentials;
        const TFA_CLEARED = true; // true means user is already fully authenticated

        // 1. Guard Clauses: Block if already cleared
        if (jwt.tfa === TFA_CLEARED) {
            throw new AppError(
                Messages.OTP_NOT_NEEDED?.message || "OTP not required.",
                Messages.OTP_NOT_NEEDED?.code || "OTP_NOT_NEEDED",
                403
            );
        }

        if (TwoFactorAuthenticationService.isEmailEmpty(jwt.eml)) {
            throw new AppError(
                Messages.UN_CONFIGURED_EMAIL?.message || "Email address is unconfigured.",
                Messages.UN_CONFIGURED_EMAIL?.code || "UN_CONFIGURED_EMAIL",
                403
            );
        }

        // 2. Process Token Engine Rules via Service
        const {id, nextTry, plainCode} = await tfaService.sendOtpWorkflow(jwt.tid);

        // 3. Side Effects: Trigger Communications
        const settings = await settingService.getCache();
        const emailSettings = settings.pri;

        try {
            await sgMail.send({
                to: jwt.eml || "",
                from: emailSettings.tta_eml_snd,
                subject: emailSettings.tta_eml_sbj,
                text: `OTP Code: ${plainCode}`,
            });
        } catch (mailError: any) {
            logger.error(`Failed to send 2FA Email verification ${mailError.message}`);
            throw new AppError(
                Messages.UNABLE_TO_SEND_EMAIL?.message || "Failed to deliver code via email.",
                Messages.UNABLE_TO_SEND_EMAIL?.code || "UNABLE_TO_SEND_EMAIL",
                500
            );
        }

        // 4. Uniform Response Output
        res.status(200).json({id, next_try: nextTry});
    });

    static validate = catchAsync(async (req: Request, res: Response): Promise<void> => {
        const {jwt} = req.credentials;
        const TFA_CLEARED = true;

        // 1. Guard Clause: Block if already cleared
        if (jwt.tfa === TFA_CLEARED) {
            throw new AppError(
                Messages.OTP_NOT_NEEDED?.message || "OTP not required.",
                Messages.OTP_NOT_NEEDED?.code || "OTP_NOT_NEEDED",
                403
            );
        }

        // 2. Validate Inputs with Joi string validation to preserve leading zeros
        const validationSchema = Joi.object({
            code: Joi.string().regex(/^\d+$/).required(),
        });

        const validatedData = await validationSchema.validateAsync(
            req.sanitize.body.only(["code"]),
            {abortEarly: false}
        );

        // 3. Process Validation & Regenerate Token via Service Layer
        const token = await tfaService.verifyOtpWorkflow(
            jwt.tid,
            validatedData.code,
            await req.credentials.user(),
            {
                ip: req.ip || null,
                browser: (req as any).useragent?.browser || null,
                os: (req as any).useragent?.os || null,
            }
        );

        // 4. Send Response
        res.status(200).json({token});
    });
}