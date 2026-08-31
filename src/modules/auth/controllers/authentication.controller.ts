// src/modules/auth/controllers/authentication.controller.ts

import {Request, Response} from "express";
import catchAsync from "../../../common/utils/catch-async";
import {loginSchema} from "../validations/login.schema";
import {authService} from "../services/auth.service";

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