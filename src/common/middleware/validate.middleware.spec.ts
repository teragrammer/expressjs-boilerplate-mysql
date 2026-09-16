import {beforeEach, describe, expect, it, vi} from "vitest";
import {NextFunction, Request, Response} from "express";
import Joi from "joi";
import {validate} from "../../../src/common/middleware/validate.middleware";

describe("validate middleware", () => {
    let req: Partial<Request> & {
        sanitize: any;
    };

    let res: Partial<Response>;
    let next: NextFunction;

    const getNextError = (): unknown => {
        const mock = next as unknown as ReturnType<typeof vi.fn>;
        return mock.mock.calls[0]?.[0];
    };

    const expectValidationError = (): void => {
        expect(next).toHaveBeenCalledOnce();

        const error = getNextError();

        expect(error).toBeInstanceOf(Error);
        expect(error).toMatchObject({
            statusCode: 422,
        });

        expect(req.sanitize.data).toBeUndefined();
    };

    beforeEach(() => {
        vi.clearAllMocks();

        req = {
            sanitize: {
                body: {
                    get: vi.fn(),
                    only: vi.fn(),
                    numeric: vi.fn(),
                },
                query: {
                    get: vi.fn(),
                    only: vi.fn(),
                    numeric: vi.fn(),
                },
                data: undefined,
            },
        };

        res = {};

        next = vi.fn() as unknown as NextFunction;
    });

    describe("successful validation", () => {
        it("should sanitize, validate, store data, and call next", async () => {
            const schema = Joi.object({
                username: Joi.string().required(),
                password: Joi.string().min(8).required(),
            });

            const input = {
                username: "testuser",
                password: "password123",
            };

            req.sanitize.body.only.mockReturnValue(input);

            const middleware = validate(
                schema,
                ["username", "password"],
            );

            await middleware(
                req as Request,
                res as Response,
                next,
            );

            expect(req.sanitize.body.only).toHaveBeenCalledOnce();
            expect(req.sanitize.body.only).toHaveBeenCalledWith([
                "username",
                "password",
            ]);

            expect(req.sanitize.data).toEqual(input);

            expect(next).toHaveBeenCalledOnce();
            expect(next).toHaveBeenCalledWith();
        });

        it("should store the transformed value returned by Joi", async () => {
            const schema = Joi.object({
                username: Joi.string().trim().required(),
                password: Joi.string().required(),
            });

            const input = {
                username: "  testuser  ",
                password: "password123",
            };

            req.sanitize.body.only.mockReturnValue(input);

            const middleware = validate(
                schema,
                ["username", "password"],
            );

            await middleware(
                req as Request,
                res as Response,
                next,
            );

            expect(req.sanitize.data).toEqual({
                username: "testuser",
                password: "password123",
            });

            expect(req.sanitize.data).not.toBe(input);
            expect(next).toHaveBeenCalledOnce();
            expect(next).toHaveBeenCalledWith();
        });

        it("should pass only the requested fields to the sanitizer", async () => {
            const schema = Joi.object({
                username: Joi.string().required(),
                password: Joi.string().required(),
            });

            const sanitizedData = {
                username: "testuser",
                password: "password123",
            };

            req.sanitize.body.only.mockReturnValue(sanitizedData);

            const middleware = validate(
                schema,
                ["username", "password"],
            );

            await middleware(
                req as Request,
                res as Response,
                next,
            );

            expect(req.sanitize.body.only).toHaveBeenCalledOnce();
            expect(req.sanitize.body.only).toHaveBeenCalledWith([
                "username",
                "password",
            ]);

            expect(req.sanitize.data).toEqual(sanitizedData);
            expect(next).toHaveBeenCalledOnce();
        });
    });

    describe("validation failures", () => {
        it("should convert Joi validation errors into a 422 AppError", async () => {
            const schema = Joi.object({
                username: Joi.string().required(),
                password: Joi.string().required(),
            });

            req.sanitize.body.only.mockReturnValue({
                username: "testuser",
            });

            const middleware = validate(
                schema,
                ["username", "password"],
            );

            await middleware(
                req as Request,
                res as Response,
                next,
            );

            expectValidationError();
        });

        it("should forward sanitization errors to next", async () => {
            const schema = Joi.object({
                username: Joi.string().required(),
            });

            const sanitizeError = new Error(
                "Sanitization failed",
            );

            req.sanitize.body.only.mockImplementation(() => {
                throw sanitizeError;
            });

            const middleware = validate(
                schema,
                ["username"],
            );

            await middleware(
                req as Request,
                res as Response,
                next,
            );

            expect(next).toHaveBeenCalledOnce();
            expect(next).toHaveBeenCalledWith(sanitizeError);
            expect(req.sanitize.data).toBeUndefined();
        });
    });

    describe("Joi configuration", () => {
        it("should validate with abortEarly disabled and stripUnknown enabled", async () => {
            const schema = Joi.object({
                username: Joi.string().required(),
                password: Joi.string().required(),
            });

            req.sanitize.body.only.mockReturnValue({});

            const validateAsync = vi.spyOn(
                schema,
                "validateAsync",
            );

            const middleware = validate(
                schema,
                ["username", "password"],
            );

            await middleware(
                req as Request,
                res as Response,
                next,
            );

            expect(validateAsync).toHaveBeenCalledOnce();

            expect(validateAsync).toHaveBeenCalledWith(
                {},
                {
                    abortEarly: false,
                    stripUnknown: true,
                },
            );

            expectValidationError();
        });
    });
});
