// src/modules/auth/controllers/register.controller.ts

import {Request, Response} from "express";
import {registerSchema} from "../validations/register.schema";
import catchAsync from "../../../common/utils/catch-async";
import {AuthService} from "../services/auth.service";
import {__ENV} from "../../../config/environment";
import {SecurityUtil} from "../../../common/utils/security.util";

// Instantiate the SecurityUtil instance first
const securityUtil = new SecurityUtil({
    bcryptSecret: __ENV.BCRYPT_SECRET,
    bcryptSaltRounds: Number(__ENV.BCRYPT_SALT_ROUND || 10)
});

const authService = new AuthService(securityUtil);

export class RegisterController {
    static create = catchAsync(async (req: Request, res: Response): Promise<void> => {
        // Sanitize input
        const rawData = req.sanitize.body.only([
            "first_name",
            "middle_name",
            "last_name",
            "username",
            "password",
            "email"
        ]);

        // Validate input
        const validatedData = await registerSchema.validateAsync(rawData, {abortEarly: false});

        // Delegate to Business Service
        const result = await authService.register(validatedData);

        // Send HTTP response
        res.status(201).json(result);
    });
}