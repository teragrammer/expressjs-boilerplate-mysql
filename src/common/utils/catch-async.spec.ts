// src/common/utils/catch-async.spec.ts
import { describe, expect, it, vi, beforeEach } from "vitest";
import { Request, Response, NextFunction } from "express";
import catchAsync from "./catch-async";

describe("catchAsync Utility", () => {
    const mockReq = {} as Request;
    const mockRes = {} as Response;
    let mockNext: NextFunction;

    beforeEach(() => {
        // Reset mock call counts before every individual test
        mockNext = vi.fn() as unknown as NextFunction;
        vi.clearAllMocks();
    });

    it("should execute the handler successfully and not call next() on resolution", async () => {
        const asyncRouteHandler = vi.fn().mockResolvedValue("success data");
        const wrappedHandler = catchAsync(asyncRouteHandler);

        await wrappedHandler(mockReq, mockRes, mockNext);

        expect(asyncRouteHandler).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
        expect(mockNext).not.toHaveBeenCalled();
    });

    it("should catch asynchronous errors and forward them to next()", async () => {
        const testError = new Error("Database connection failed");
        const asyncRouteHandler = vi.fn().mockRejectedValue(testError);
        const wrappedHandler = catchAsync(asyncRouteHandler);

        await wrappedHandler(mockReq, mockRes, mockNext);

        expect(asyncRouteHandler).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
        expect(mockNext).toHaveBeenCalledTimes(1);
        expect(mockNext).toHaveBeenCalledWith(testError);
    });

    it("should catch synchronous errors thrown inside the async wrapper and forward them to next()", async () => {
        const testError = new Error("Synchronous breakdown");
        const asyncRouteHandler = vi.fn().mockImplementation(async () => {
            throw testError;
        });
        const wrappedHandler = catchAsync(asyncRouteHandler);

        await wrappedHandler(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalledTimes(1);
        expect(mockNext).toHaveBeenCalledWith(testError);
    });
});