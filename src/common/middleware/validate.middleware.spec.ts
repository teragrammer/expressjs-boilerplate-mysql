// src/common/middleware/validate.middleware.spec.ts
import {beforeEach, describe, expect, it, vi} from "vitest";
import {NextFunction, Request, Response} from "express";
import Joi from "joi";
import {validate} from "./validate.middleware";

type MockSanitizerHelper = {
    get: ReturnType<typeof vi.fn>;
    only: ReturnType<typeof vi.fn>;
    numeric: ReturnType<typeof vi.fn>;
};

type TestRequest = Omit<Partial<Request>, "sanitize"> & {
    sanitize: {
        body: MockSanitizerHelper;
        query: MockSanitizerHelper;
        data: Record<string, unknown> | undefined;
    };
};

describe("validate middleware", () => {
    let req: TestRequest;
    let res: Partial<Response>;
    let next: NextFunction;

    const getNextError = (): unknown => {
        const mock = next as unknown as ReturnType<typeof vi.fn>;

        return mock.mock.calls[0]?.[0];
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
            expect(next).toHaveBeenCalledWith();
        });
    });

    describe("validation failures", () => {
        it("should forward Joi validation errors to next", async () => {
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

            expect(next).toHaveBeenCalledOnce();

            const error = getNextError();

            expect(error).toBeInstanceOf(Joi.ValidationError);

            expect(error).toMatchObject({
                message: '"password" is required',
            });

            expect(req.sanitize.data).toBeUndefined();
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

            expect(next).toHaveBeenCalledOnce();

            const error = getNextError();

            expect(error).toBeInstanceOf(Joi.ValidationError);

            expect(error).toMatchObject({
                details: expect.arrayContaining([
                    expect.objectContaining({
                        path: ["username"],
                        type: "any.required",
                    }),
                    expect.objectContaining({
                        path: ["password"],
                        type: "any.required",
                    }),
                ]),
            });

            expect(req.sanitize.data).toBeUndefined();
        });
    });

    describe("schema factory", () => {
        it("should resolve the schema from the request", async () => {
            const schema = Joi.object({
                username: Joi.string().required(),
            });

            const schemaFactory = vi.fn().mockReturnValue(schema);

            const input = {
                username: "testuser",
            };

            req.sanitize.body.only.mockReturnValue(input);

            const middleware = validate(
                schemaFactory,
                ["username"],
            );

            await middleware(
                req as Request,
                res as Response,
                next,
            );

            expect(schemaFactory).toHaveBeenCalledOnce();
            expect(schemaFactory).toHaveBeenCalledWith(req);

            expect(req.sanitize.data).toEqual(input);

            expect(next).toHaveBeenCalledOnce();
            expect(next).toHaveBeenCalledWith();
        });

        it("should forward errors thrown by the schema factory", async () => {
            const factoryError = new Error(
                "Failed to create schema",
            );

            const schemaFactory = vi.fn().mockImplementation(() => {
                throw factoryError;
            });

            const middleware = validate(
                schemaFactory,
                ["username"],
            );

            await middleware(
                req as Request,
                res as Response,
                next,
            );

            expect(schemaFactory).toHaveBeenCalledOnce();

            expect(next).toHaveBeenCalledOnce();
            expect(next).toHaveBeenCalledWith(factoryError);

            expect(req.sanitize.data).toBeUndefined();
        });
    });

    describe("unknown fields", () => {
        it("should strip unknown fields from the validated result", async () => {
            const schema = Joi.object({
                username: Joi.string().required(),
                password: Joi.string().required(),
            });

            const input = {
                username: "testuser",
                password: "password123",
                unexpected: "should be removed",
            };

            req.sanitize.body.only.mockReturnValue(input);

            const middleware = validate(
                schema,
                ["username", "password", "unexpected"],
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

            expect(req.sanitize.data).not.toHaveProperty(
                "unexpected",
            );

            expect(next).toHaveBeenCalledOnce();
            expect(next).toHaveBeenCalledWith();
        });
    });
});
