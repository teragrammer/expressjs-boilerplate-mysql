// src/modules/auth/controllers/register.controller.ts
import {Request, Response} from "express";
import {registerSchema} from "../validations/register.schema";
import {SecurityUtil} from "../../../common/utils/security.util";
import {DateUtil} from "../../../common/utils/date.util";
import {Role} from "../../role/role.interface";
import catchAsync from "../../../common/utils/catch-async";
import {RoleService} from "../../role/role.service";
import {UserService} from "../../users/user.service";
import {User} from "../../users/user.interface";
import {TokenService} from "../services/authentication-token.service";

class Controller {
    create = catchAsync(async (req: Request, res: Response): Promise<void> => {
        const rawData = req.sanitize.body.only(["first_name", "middle_name", "last_name", "username", "password", "email"]);

        // Clean Validation Execution
        // validateAsync is required here since we evaluate database uniqueness asynchronously
        const validatedData = await registerSchema.validateAsync(rawData, {abortEarly: false});

        // Instantiate your service layer (preferably done once at the class/module level)
        const roleService = new RoleService();
        // Fetch the role safely using the service layer
        const role: Role = await roleService.getRoleBySlug("customer");

        // Process Account Record Creation securely
        validatedData.role_id = role.id;
        validatedData.password = await SecurityUtil().hash(validatedData.password);
        validatedData.created_at = DateUtil().sql();

        // Instantiate the repository
        const userService = new UserService();
        // Insert the validated data using our repository pattern
        // The repo handles mapping and safely returns the full created UserLegacy object
        const newUser: User = await userService.createUser(req.body);

        // Generate the JWT token
        const tokenService = new TokenService();
        const token = tokenService.generateToken({uid: newUser.id, tid: 0, tfa: true});

        res.status(200).json({token});
    });
}

const RegisterController = new Controller();
export default RegisterController;