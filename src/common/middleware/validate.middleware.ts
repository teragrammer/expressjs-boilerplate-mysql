import {RequestHandler} from "express";
import Joi from "joi";
import catchAsync from "../utils/catch-async";

const validate = <T extends Record<string, unknown>>(
    schema: Joi.ObjectSchema<T>,
    fields: string[],
): RequestHandler =>
    catchAsync(async (req, res, next) => {
        const input = req.sanitize.body.only(fields);

        req.sanitize.data = await schema.validateAsync(input, {
            abortEarly: false,
        });

        next();
    });

export default validate;
