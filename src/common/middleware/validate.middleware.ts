// src/common/middlewares/validate.ts

import {NextFunction, Request, Response} from "express";
import Joi from "../../shared/validations";
import type {ObjectSchema} from "joi";
import Messages from "../utils/messages";
import {AppError} from "../utils/errors";

export const validate = (schema: ObjectSchema, fields: string[]) => {
    return async (
        req: Request,
        _res: Response,
        next: NextFunction,
    ): Promise<void> => {
        try {
            const data = req.sanitize.body.only(fields);

            req.sanitize.data = await schema.validateAsync(data, {
                abortEarly: false,
                stripUnknown: true,
            });

            next();
        } catch (error) {
            if (error instanceof Joi.ValidationError) {
                next(
                    new AppError(
                        Messages.VALIDATION_FAILED.message,
                        Messages.VALIDATION_FAILED.code,
                        422,
                    ),
                );

                return;
            }

            next(error);
        }
    };
};
