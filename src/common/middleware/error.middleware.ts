// src/common/middleware/error.middleware.ts
import {NextFunction, Request, Response} from 'express';
import Joi from 'joi';
import {logger} from '../../config/logger';
import errors from "../utils/messages";
import {AppError} from "../utils/errors";

export const errorHandler = (
    err: any,
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    // Handle Joi Validation Failures cleanly
    if (err instanceof Joi.ValidationError) {
        res.status(422).json({
            code: errors.VALIDATION_FAILED.code,
            message: errors.VALIDATION_FAILED.message,
            errors: err.details.map((err: any) => {
                const field = err.message.replace(/^"|"$|"/g, "");

                return {
                    field: err.path[0],
                    message: field
                        .split("_")
                        .map((word: any) => (word.toLowerCase() === "id" ? "ID" : word.charAt(0).toUpperCase() + word.slice(1)))
                        .join(" "),
                };
            })
        });
        return;
    }

    // If it's our known custom AppError, use its status code
    if (err instanceof AppError) {
        res.status(err.statusCode).json({
            code: err.errorCode || errors.SERVER_ERROR.code,
            message: err.message,
        });
        return;
    }

    // Fallback for catastrophic system failures
    logger.error('Unhandled Application Exception:', err);

    res.status(500).json({
        code: errors.SERVER_ERROR.code,
        message: errors.SERVER_ERROR.message,
    });
};