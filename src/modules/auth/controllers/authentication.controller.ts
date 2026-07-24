// src/modules/auth/controllers/authentication.controller.ts

import {Request, Response} from "express";
import catchAsync from "../../../common/utils/catch-async";
import {loginSchema} from "../validations/login.schema";
import {AuthService} from "../services/auth.service";
import {SecurityUtil} from "../../../common/utils/security.util"; // Import SecurityUtil
import {__ENV} from "../../../config/environment";

// Instantiate the SecurityUtil instance first
const securityUtil = new SecurityUtil({
    bcryptSecret: __ENV.BCRYPT_SECRET,
    bcryptSaltRounds: Number(__ENV.BCRYPT_SALT_ROUND || 10)
});

const authService = new AuthService(securityUtil);

export class AuthenticationController {
    static login = catchAsync(async (req: Request, res: Response) => {
        // Sanitize input
        const rawData = req.sanitize.body.only([
            "username",
            "password",
        ]);

        // Validate input
        const validatedData = await loginSchema.validateAsync(rawData, {abortEarly: false});

        // Delegate to Business Service
        const result = await authService.login(validatedData);

        // Send HTTP response
        res.status(200).json(result);
    });

    static logout = catchAsync(async (req: Request, res: Response): Promise<any> => {
        await authService.logout(req.credentials.jwt.tid);
        res.status(200).send();
    });
}