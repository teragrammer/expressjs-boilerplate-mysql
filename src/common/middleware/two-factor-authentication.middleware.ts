// src/common/middleware/two-factor-authentication.middleware.ts
import {NextFunction, Request, Response} from "express";
import errors from "../utils/messages";
import {assertCredentials} from "../utils/request-credentials";

export function TwoFactorAuthenticationMiddleware(isHalt = true) {
    return async function (
        req: Request,
        res: Response,
        next: NextFunction,
    ): Promise<void> {
        if (!req.credentials) {
            if (isHalt) {
                res.status(401).json({
                    code: "AUTH_OTP_EXPIRED",
                    message: errors.EXPIRED_AUTH_TOKEN.message,
                });

                return;
            }

            next();
            return;
        }

        assertCredentials(req);

        if (!req.credentials.jwt.tfa) {
            res.status(403).json({
                code: "AUTH_OTP_INCOMPLETE",
                message: errors.INCOMPLETE_OTP.message,
            });

            return;
        }

        next();
    };
}
