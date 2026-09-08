import {NextFunction, Request, Response} from "express";
import errors from "../utils/messages";
import RouteGuardService from "../../modules/system/services/route-guard.service.legacy";

export function AuthorizationMiddleware(route: string, isHalt = true) {
    return async function (req: Request, res: Response, next: NextFunction) {
        const credentials = req.credentials;

        if (!credentials && isHalt) return res.status(401).json({
            code: "AUTH_PERM_EXPIRED",
            message: errors.EXPIRED_AUTH_TOKEN.message,
        });

        if (credentials && isHalt) {
            const BYPASS: number | undefined = credentials.jwt.bpa;
            if (BYPASS === 1) return next();

            const GUARDS: Record<string, string[]> = await RouteGuardService.getCache();
            const ROLE: string | undefined = credentials.jwt.rol;

            if (!GUARDS || !ROLE) return res.status(403).json({
                code: "AUTH_PERM_CACHE",
                message: errors.NO_PERMISSION.message,
            });

            if (typeof GUARDS[ROLE] === "undefined") return res.status(403).json({
                code: "AUTH_PERM_UNDEFINED",
                message: errors.NO_PERMISSION.message,
            });

            if (!GUARDS[ROLE].includes(route)) return res.status(403).json({
                code: "AUTH_PERM_UNAUTHORIZED",
                message: errors.NO_PERMISSION.message,
            });
        }

        next();
    };
}