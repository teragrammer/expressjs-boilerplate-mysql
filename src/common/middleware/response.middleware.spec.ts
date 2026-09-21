// src/common/middleware/response.middleware.spec.ts
import {beforeEach, describe, expect, it, vi} from "vitest";
import {NextFunction, Request, Response} from "express";
import responseHandler from "./response.middleware";
import Messages from "../utils/messages";

describe("Response Middleware", () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let nextFunction: NextFunction;

    beforeEach(() => {
        mockRequest = {};
        mockResponse = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn(),
        };
        nextFunction = vi.fn();
    });

    describe("Initialization", () => {
        it("should attach failed helper methods to response object and call next", () => {
            responseHandler(
                mockRequest as Request,
                mockResponse as Response,
                nextFunction
            );

            expect(mockResponse.failed).toBeDefined();
            expect(typeof mockResponse.failed?.message).toBe("function");
            expect(typeof mockResponse.failed?.fields).toBe("function");
            expect(nextFunction).toHaveBeenCalledTimes(1);
        });
    });

    describe("res.failed.message()", () => {
        it("should send correct status and system message when a valid code is provided without custom message", () => {
            responseHandler(
                mockRequest as Request,
                mockResponse as Response,
                nextFunction
            );

            mockResponse.failed?.message(404, undefined, "DATA_NOT_FOUND");

            expect(mockResponse.status).toHaveBeenCalledWith(404);
            expect(mockResponse.json).toHaveBeenCalledWith({
                code: Messages.DATA_NOT_FOUND.code,
                message: Messages.DATA_NOT_FOUND.message,
            });
        });

        it("should override the default message when a custom message is provided with a valid code", () => {
            responseHandler(
                mockRequest as Request,
                mockResponse as Response,
                nextFunction
            );

            const customMessage = "Custom user-friendly not found message";
            mockResponse.failed?.message(404, customMessage, "DATA_NOT_FOUND");

            expect(mockResponse.status).toHaveBeenCalledWith(404);
            expect(mockResponse.json).toHaveBeenCalledWith({
                code: Messages.DATA_NOT_FOUND.code,
                message: customMessage,
            });
        });

        it("should fallback to SERVER_ERROR when an invalid or unknown code is provided", () => {
            responseHandler(
                mockRequest as Request,
                mockResponse as Response,
                nextFunction
            );

            mockResponse.failed?.message(500, undefined, "UNKNOWN_INVALID_CODE");

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({
                code: Messages.SERVER_ERROR.code,
                message: Messages.SERVER_ERROR.message,
            });
        });

        it("should fallback to SERVER_ERROR when the code argument is omitted", () => {
            responseHandler(
                mockRequest as Request,
                mockResponse as Response,
                nextFunction
            );

            mockResponse.failed?.message(500, "Something broke");

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({
                code: Messages.SERVER_ERROR.code,
                message: "Something broke",
            });
        });
    });

    describe("res.failed.fields()", () => {
        it("should wrap non-array validation errors into an array", () => {
            responseHandler(
                mockRequest as Request,
                mockResponse as Response,
                nextFunction
            );

            const singleError = {field: "email", message: "Email is required"};
            mockResponse.failed?.fields(422, singleError);

            expect(mockResponse.status).toHaveBeenCalledWith(422);
            expect(mockResponse.json).toHaveBeenCalledWith({
                code: Messages.VALIDATION_FAILED.code,
                message: Messages.VALIDATION_FAILED.message,
                errors: [singleError],
            });
        });

        it("should keep validation errors as an array when an array is passed", () => {
            responseHandler(
                mockRequest as Request,
                mockResponse as Response,
                nextFunction
            );

            const errorArray = [
                {field: "email", message: "Email is required"},
                {field: "password", message: "Password is too short"},
            ];
            mockResponse.failed?.fields(422, errorArray);

            expect(mockResponse.status).toHaveBeenCalledWith(422);
            expect(mockResponse.json).toHaveBeenCalledWith({
                code: Messages.VALIDATION_FAILED.code,
                message: Messages.VALIDATION_FAILED.message,
                errors: errorArray,
            });
        });
    });
});