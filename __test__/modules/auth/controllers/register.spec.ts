import {beforeEach, describe, expect, it, vi} from "vitest";
import {Request, Response} from "express";
// 3. Import the controller after mocks are prepared
import RegisterController from "../../../../src/modules/auth/controllers/register.controller";

// 1. Hoist the mock function so it is available before imports are executed
const {mockRegister} = vi.hoisted(() => ({
    mockRegister: vi.fn(),
}));

// 2. Mock ONLY the AuthService (The single direct dependency of the controller)
vi.mock("../../../../src/modules/auth/services/auth.service", () => ({
    AuthService: function () {
        return {
            register: mockRegister,
        };
    },
}));

// Mock the validation schema
const mockValidateAsync = vi.fn();
vi.mock("../../../../src/modules/auth/validations/register.schema", () => ({
    registerSchema: {
        validateAsync: (...args: any[]) => mockValidateAsync(...args),
    },
}));

describe("RegisterController - create", () => {
    let req: any;
    let res: Partial<Response>;
    let jsonMock: any;
    let statusMock: any;
    let nextMock: any;

    beforeEach(() => {
        vi.clearAllMocks();

        jsonMock = vi.fn();
        statusMock = vi.fn().mockImplementation(() => ({json: jsonMock}));
        res = {
            status: statusMock,
        };
        nextMock = vi.fn();

        req = {
            body: {
                first_name: "John",
                last_name: "Doe",
                username: "johndoe",
                password: "password123",
                email: "john@example.com",
            },
            sanitize: {
                body: {
                    only: vi.fn().mockReturnValue({
                        first_name: "John",
                        last_name: "Doe",
                        username: "johndoe",
                        password: "password123",
                        email: "john@example.com",
                    }),
                },
            },
        } as any;
    });

    it("should successfully sanitize, validate, delegate to AuthService, and return token", async () => {
        const mockValidatedData = {
            first_name: "John",
            last_name: "Doe",
            username: "johndoe",
            password: "password123",
            email: "john@example.com",
        };
        mockValidateAsync.mockResolvedValue(mockValidatedData);
        mockRegister.mockResolvedValue({token: "mocked-jwt-token-string"});

        // Execute controller handler
        RegisterController.create(req as Request, res as Response, nextMock);

        await new Promise(process.nextTick);

        // Verify clean request lifecycle boundaries
        expect(nextMock).not.toHaveBeenCalled();
        expect(req.sanitize.body.only).toHaveBeenCalledWith([
            "first_name",
            "middle_name",
            "last_name",
            "username",
            "password",
            "email",
        ]);

        expect(mockValidateAsync).toHaveBeenCalledWith(mockValidatedData, {abortEarly: false});

        // Ensure work is delegated properly to the business service layer
        expect(mockRegister).toHaveBeenCalledWith(mockValidatedData);

        expect(statusMock).toHaveBeenCalledWith(201);
        expect(jsonMock).toHaveBeenCalledWith({token: "mocked-jwt-token-string"});
    });

    it("should call next with validation error when schema verification fails", async () => {
        const validationError = new Error("Schema validation failed");
        mockValidateAsync.mockRejectedValue(validationError);

        RegisterController.create(req as Request, res as Response, nextMock);

        await new Promise(process.nextTick);

        expect(nextMock).toHaveBeenCalledWith(validationError);
        expect(mockRegister).not.toHaveBeenCalled();
    });

    it("should forward business logic exceptions from AuthService to next middleware", async () => {
        const mockValidatedData = {
            first_name: "John",
            last_name: "Doe",
            username: "johndoe",
            password: "password123",
            email: "john@example.com",
        };
        mockValidateAsync.mockResolvedValue(mockValidatedData);

        const businessError = new Error("Email address already registered");
        mockRegister.mockRejectedValue(businessError);

        RegisterController.create(req as Request, res as Response, nextMock);

        await new Promise(process.nextTick);

        expect(nextMock).toHaveBeenCalledWith(businessError);
        expect(statusMock).not.toHaveBeenCalled();
    });
});