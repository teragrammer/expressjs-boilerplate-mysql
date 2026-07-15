import {beforeEach, describe, expect, it, vi} from "vitest";
import {Request, Response} from "express";
import RegisterController from "../../../../src/modules/auth/controllers/register.controller";

// Mock the Schema and its validation method
const mockValidateAsync = vi.fn();
vi.mock("../../../../src/modules/auth/validations/register.schema", () => ({
    registerSchema: {
        validateAsync: (...args: any[]) => mockValidateAsync(...args),
    },
}));

// Mock Utilities (using standard constructible functions/classes)
const mockHash = vi.fn();
vi.mock("../../../../src/common/utils/security.util", () => ({
    SecurityUtil: function () {
        return {
            hash: mockHash,
        };
    },
}));

const mockSqlDate = vi.fn();
vi.mock("../../../../src/common/utils/date.util", () => ({
    DateUtil: function () {
        return {
            sql: mockSqlDate,
        };
    },
}));

// Mock the Services (using standard constructible functions)
const mockGetRoleBySlug = vi.fn();
vi.mock("../../../../src/modules/role/role.service", () => {
    return {
        RoleService: function () {
            return {
                getRoleBySlug: mockGetRoleBySlug,
            };
        },
    };
});

const mockCreateUser = vi.fn();
vi.mock("../../../../src/modules/users/user.service", () => {
    return {
        UserService: function () {
            return {
                createUser: mockCreateUser,
            };
        },
    };
});

const mockGenerateToken = vi.fn();
vi.mock("../../../../src/modules/auth/services/authentication-token.service", () => {
    return {
        TokenService: function () {
            return {
                generateToken: mockGenerateToken,
            };
        },
    };
});

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

    it("should successfully register a user and return a JWT token", async () => {
        const mockValidatedData = {
            first_name: "John",
            last_name: "Doe",
            username: "johndoe",
            password: "password123",
            email: "john@example.com",
        };
        mockValidateAsync.mockResolvedValue(mockValidatedData);

        mockGetRoleBySlug.mockResolvedValue({id: 2, slug: "customer", name: "Customer"});
        mockHash.mockResolvedValue("hashed_password_123");
        mockSqlDate.mockReturnValue("2026-07-15 09:00:00");

        const mockCreatedUser = {id: 42, email: "john@example.com"};
        mockCreateUser.mockResolvedValue(mockCreatedUser);
        mockGenerateToken.mockReturnValue("mocked-jwt-token-string");

        RegisterController.create(req as Request, res as Response, nextMock);

        await new Promise(process.nextTick);

        expect(nextMock).not.toHaveBeenCalled();
        expect(req.sanitize.body.only).toHaveBeenCalledWith([
            "first_name",
            "middle_name",
            "last_name",
            "username",
            "password",
            "email",
        ]);

        expect(mockValidateAsync).toHaveBeenCalledWith({
            first_name: "John",
            last_name: "Doe",
            username: "johndoe",
            password: "password123",
            email: "john@example.com",
        }, {abortEarly: false});

        expect(mockGetRoleBySlug).toHaveBeenCalledWith("customer");
        expect(mockHash).toHaveBeenCalledWith("password123");
        expect(mockSqlDate).toHaveBeenCalled();

        expect(mockCreateUser).toHaveBeenCalledWith({
            first_name: "John",
            last_name: "Doe",
            username: "johndoe",
            password: "password123",
            email: "john@example.com",
        });

        expect(mockGenerateToken).toHaveBeenCalledWith({
            uid: 42,
            tid: 0,
            tfa: true,
        });

        expect(statusMock).toHaveBeenCalledWith(200);
        expect(jsonMock).toHaveBeenCalledWith({token: "mocked-jwt-token-string"});
    });

    it("should call next with a validation error when validation fails", async () => {
        const validationError = new Error("Validation Failed");
        mockValidateAsync.mockRejectedValue(validationError);

        RegisterController.create(req as Request, res as Response, nextMock);

        await new Promise(process.nextTick);

        // Verify the controller stopped and forwarded the validation error to next middleware
        expect(nextMock).toHaveBeenCalledWith(validationError);
        expect(mockGetRoleBySlug).not.toHaveBeenCalled();
        expect(mockCreateUser).not.toHaveBeenCalled();
    });

    it("should call next with an error if RoleService fails or role is missing", async () => {
        const mockValidatedData = {
            first_name: "John",
            last_name: "Doe",
            username: "johndoe",
            password: "password123",
            email: "john@example.com",
        };
        mockValidateAsync.mockResolvedValue(mockValidatedData);

        // Simulate missing role or failing DB query
        const roleError = new Error("Role 'customer' not found");
        mockGetRoleBySlug.mockRejectedValue(roleError);

        RegisterController.create(req as Request, res as Response, nextMock);

        await new Promise(process.nextTick);

        expect(nextMock).toHaveBeenCalledWith(roleError);
        expect(mockCreateUser).not.toHaveBeenCalled();
    });

    it("should call next with an error if UserService.createUser fails", async () => {
        const mockValidatedData = {
            first_name: "John",
            last_name: "Doe",
            username: "johndoe",
            password: "password123",
            email: "john@example.com",
        };
        mockValidateAsync.mockResolvedValue(mockValidatedData);
        mockGetRoleBySlug.mockResolvedValue({id: 2, slug: "customer", name: "Customer"});
        mockHash.mockResolvedValue("hashed_password_123");
        mockSqlDate.mockReturnValue("2026-07-15 09:00:00");

        // Simulate database constraint error (e.g., unique email violation)
        const dbError = new Error("Unique constraint violation on email");
        mockCreateUser.mockRejectedValue(dbError);

        RegisterController.create(req as Request, res as Response, nextMock);

        await new Promise(process.nextTick);

        expect(nextMock).toHaveBeenCalledWith(dbError);
        expect(mockGenerateToken).not.toHaveBeenCalled();
    });
});