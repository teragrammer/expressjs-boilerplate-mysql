// src/common/middleware/response.middleware.ts
import {NextFunction, Request, Response} from "express";
import Messages from "../utils/messages";

type MessageCode = keyof typeof Messages;

const responseHandler = (
    _req: Request,
    res: Response,
    next: NextFunction,
): void => {
    res.failed = {
        message: (
            status: number,
            message?: string,
            code?: MessageCode | string,
        ): void => {
            const systemMessage = (
                code && code in Messages
                    ? Messages[code as MessageCode]
                    : Messages.SERVER_ERROR
            );

            res.status(status).json({
                code: systemMessage.code,
                message: message ?? systemMessage.message,
            });
        },

        fields: (
            status: number,
            errors: Record<string, any> | any,
        ): void => {
            res.status(status).json({
                code: Messages.VALIDATION_FAILED.code,
                message: Messages.VALIDATION_FAILED.message,
                errors: Array.isArray(errors)
                    ? errors
                    : [errors],
            });
        },
    };

    next();
};

export default responseHandler;
