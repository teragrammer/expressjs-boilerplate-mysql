// src/modules/auth/controllers/register.controller.ts

import {Request, Response} from "express";
import catchAsync from "../../../common/utils/catch-async";
import {AuthService} from "../services/auth.service";
import {RegisterInput} from "../interfaces/register-input.interface";

export class RegisterController {
    constructor(
        private readonly authService: AuthService,
    ) {
    }

    create = catchAsync(async (req: Request, res: Response): Promise<void> => {
        // Delegate to Business Service
        const result = await this.authService.register(req.sanitize.data as unknown as RegisterInput);

        // Send HTTP response
        res.status(201).json(result);
    });
}