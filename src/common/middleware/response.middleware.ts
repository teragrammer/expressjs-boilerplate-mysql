import {NextFunction, Request, Response} from "express";
import Messages from "../utils/messages";

type MessageCode = keyof typeof Messages;

// Declare a clean interface for a single message object
interface SystemMessage {
    readonly code: string;
    readonly message: string;
}

const responseHandler = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    res.failed = {
        message: (status: number, message?: string, code?: MessageCode | string) => {
            // Explicitly type _code as SystemMessage so it accepts any of the sub-objects
            let _code: SystemMessage = Messages.SERVER_ERROR;

            if (code && code in Messages) {
                _code = Messages[code as MessageCode];
            }

            res.status(status).json({
                code: _code.code,
                message: message ? message : _code.message,
            });
        },

        fields: (status: number, _errors: any) => {
            res.status(status).json({
                code: Messages.VALIDATION_FAILED.code,
                message: Messages.VALIDATION_FAILED.message,
                errors: [_errors],
            });
        },
    };

    next();
};

export default responseHandler;