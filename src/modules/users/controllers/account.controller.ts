// src/modules/users/controllers/account.controller.ts
import {Request, Response} from "express";
import errors from "../../../common/utils/messages";
import {logger} from "../../../config/logger";
import catchAsync from "../../../common/utils/catch-async";
import {SecurityUserDTO, UpdateUserDTO} from "../user.interface";
import {AccountService} from "../services/account.service";

export class AccountController {
    constructor(
        private readonly accountService: AccountService,
    ) {
    }

    information = catchAsync(async (req: Request, res: Response): Promise<any> => {
        try {
            const token = await this.accountService.information(
                req.credentials.jwt.uid,
                req.sanitize.data as UpdateUserDTO
            );

            res.status(200).json(token);
        } catch (e) {
            logger.error(e);

            res.status(500).json({
                code: errors.SERVER_ERROR.code,
                message: errors.SERVER_ERROR.message,
            });
        }
    });

    password = catchAsync(async (req: Request, res: Response): Promise<any> => {
        try {
            const token: string = await this.accountService.password(
                await req.credentials.user(),
                req.sanitize.data as SecurityUserDTO
            );

            res.status(200).json(token);
        } catch (e) {
            logger.error(e);

            res.status(500).json({
                code: errors.SERVER_ERROR.code,
                message: errors.SERVER_ERROR.message,
            });
        }
    });
}