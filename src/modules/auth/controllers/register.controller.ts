// src/modules/auth/controllers/register.controller.ts
import {Request, Response} from "express";
import {registerSchema} from "../validations/register.schema";
import {SecurityUtil} from "../../../common/utils/security.util";
import {DateUtil} from "../../../common/utils/date.util";
import catchAsync from "../../../common/utils/catch-async";
import {RoleService} from "../../role/role.service";
import {UserService} from "../../users/user.service";
import {TokenService} from "../services/authentication-token.service";

class Controller {
    // Instantiating services once at the class level (Simplifies testing and saves memory)
    private readonly roleService = new RoleService();
    private readonly userService = new UserService();
    private readonly tokenService = new TokenService();
    private readonly securityUtil = SecurityUtil();
    private readonly dateUtil = DateUtil();

    create = catchAsync(async (req: Request, res: Response): Promise<void> => {
        // Only pluck the fields we care about
        const rawData = req.sanitize.body.only([
            "first_name",
            "middle_name",
            "last_name",
            "username",
            "password",
            "email"
        ]);

        // Clean validation execution
        const validatedData = await registerSchema.validateAsync(rawData, {abortEarly: false});

        // Fetch the default customer role safely
        const role = await this.roleService.getRoleBySlug("customer");
        if (!role) {
            throw new Error("Default registration role 'customer' could not be resolved.");
        }

        // Hash password and capture creation timestamp
        const hashedPassword = await this.securityUtil.hash(validatedData.password);
        const createdAt = this.dateUtil.sql();

        // BUILD A CLEAN PAYLOAD (Instead of mutating validatedData or passing req.body)
        const userPayload = {
            ...validatedData,
            password: hashedPassword,
            role_id: role.id,
            created_at: createdAt
        };

        // PERSIST THE USER (Passing the safe, hashed userPayload)
        const newUser = await this.userService.createUser(userPayload);

        // Generate the JWT token
        const token = this.tokenService.generateToken({
            uid: newUser.id,
            tid: 0,
            // Set to 'false' because a newly registered user must still complete 2FA validation
            // before they are considered fully authenticated (if 2FA is active/required).
            tfa: false,
        });

        res.status(201).json({token}); // 201 Created is semantically better for registration!
    });
}

const RegisterController = new Controller();
export default RegisterController;