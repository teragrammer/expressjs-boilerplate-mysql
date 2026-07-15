import {beforeEach, describe, expect, it, vi} from "vitest";
import {Request, Response} from "express";
// 3. Import the controller AFTER mocks are set up to prevent premature constructor execution errors
import RegisterController from "../../../../src/modules/auth/controllers/register.controller";

// 1. Hoist variables so they exist before any ES module imports/mocks are evaluated
const {
    mockValidateAsync,
    mockHash,
    mockSqlDate,
    mockGetRoleBySlug,
    mockCreateUser,
    mockGenerateToken,
} = vi.hoisted(() => ({
    mockValidateAsync: vi.fn(),
    mockHash: vi.fn(),
    mockSqlDate: vi.fn(),
    mockGetRoleBySlug: vi.fn(),
    mockCreateUser: vi.fn(),
    mockGenerateToken: vi.fn(),
}));

// 2. Define Mocks using the hoisted variables
vi.mock("../../../../src/modules/auth/validations/register.schema", () => ({
    registerSchema: {
        validateAsync: (...args: any[]) => mockValidateAsync(...args),
    },
}));

vi.mock("../../../../src/common/utils/security.util", () => ({
    SecurityUtil: function () {
        return {
            hash: mockHash,
        };
    },
}));

vi.mock("../../../../src/common/utils/date.util", () => ({
    DateUtil: function () {
        return {
            sql: mockSqlDate,
        };
    },
}));

vi.mock("../../../../src/modules/role/role.service", () => ({
    RoleService: function () {
        return {
            getRoleBySlug: mockGetRoleBySlug,
        };
    },
}));

vi.mock("../../../../src/modules/users/user.service", () => ({
    UserService: function () {
        return {
            createUser: mockCreateUser,
        };
    },
}));

vi.mock("../../../../src/modules/auth/services/authentication-token.service", () => ({
    TokenService: function () {
        return {
            generateToken: mockGenerateToken,
        };
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
            password: "hashed_password_123",
            role_id: 2,
            created_at: "2026-07-15 09:00:00",
            email: "john@example.com",
        });

        expect(mockGenerateToken).toHaveBeenCalledWith({
            uid: 42,
            tid: 0,
            tfa: false,
        });

        expect(statusMock).toHaveBeenCalledWith(201);
        expect(jsonMock).toHaveBeenCalledWith({token: "mocked-jwt-token-string"});
    });

    it("should call next with a validation error when validation fails", async () => {
        const validationError = new Error("Validation Failed");
        mockValidateAsync.mockRejectedValue(validationError);

        RegisterController.create(req as Request, res as Response, nextMock);

        await new Promise(process.nextTick);

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

        const dbError = new Error("Unique constraint violation on email");
        mockCreateUser.mockRejectedValue(dbError);

        RegisterController.create(req as Request, res as Response, nextMock);

        await new Promise(process.nextTick);

        expect(nextMock).toHaveBeenCalledWith(dbError);
        expect(mockGenerateToken).not.toHaveBeenCalled();
    });
});