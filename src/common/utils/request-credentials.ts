// src/common/utils/request-credentials.ts
import {Request} from "express";
import {Messages} from "./messages";
import {AppError} from "./errors";
import {RequestCredentials} from "../../@types/express";

export function assertCredentials(
    req: Request,
): asserts req is Request & {
    credentials: RequestCredentials;
} {
    if (!req.credentials) {
        throw new AppError(Messages.INVALID_AUTH_TOKEN);
    }
}
