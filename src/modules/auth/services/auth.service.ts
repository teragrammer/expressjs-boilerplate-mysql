// src/modules/auth/services/auth.service.ts

import {RoleService} from "../../role/role.service";
import {UserService} from "../../users/user.service";
import {TokenService} from "./auth-token.service";
import {SecurityUtil} from "../../../common/utils/security.util";
import {DateUtil} from "../../../common/utils/date.util";
import {RegisterInput} from "../interfaces/register-input.interface";

export class AuthService {
    private readonly roleService = new RoleService();
    private readonly userService = new UserService();
    private readonly tokenService = new TokenService();
    private readonly securityUtil = SecurityUtil();
    private readonly dateUtil = DateUtil();

    /**
     * Executes the business workflow for registering a new customer.
     */
    async registerCustomer(data: RegisterInput): Promise<{ token: string }> {
        // Resolve Default Role
        const role = await this.roleService.getRoleBySlug("customer");
        if (!role) {
            throw new Error("Default registration role 'customer' could not be resolved.");
        }

        // Hash Password & Timestamp
        const hashedPassword = await this.securityUtil.hash(data.password);
        const createdAt = this.dateUtil.sql();

        // Persist User
        const newUser = await this.userService.createUser({
            ...data,
            password: hashedPassword,
            role_id: role.id,
            created_at: createdAt,
        });

        // Generate Initial Session Token
        const token = this.tokenService.generateToken({
            uid: newUser.id,
            tid: 0,
            tfa: false,
        });

        return {token};
    }
}