import {NextFunction, Request, Response} from "express";
import errors from "../../configurations/errors";

const RESPONSE_MIDDLEWARE = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    res.failed = {
        message: (status: number, message?: string, code?: any) => {
            let _code = errors.SERVER_ERROR;
            if (code && code in errors) _code = errors[code];

            res.status(status).json({
                code: _code.code,
                message: message ? message : _code.message,
            });
        },

        fields: (status: number, _errors: any) => {
            res.status(status).json({
                code: errors.VALIDATION_FAILED.code,
                message: errors.VALIDATION_FAILED.message,
                errors: [_errors],
            });
        },
    };

    next();
};

export default RESPONSE_MIDDLEWARE;