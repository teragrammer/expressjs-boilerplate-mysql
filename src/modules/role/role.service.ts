// src/modules/role/role.service.ts
import {RoleRepository} from "./role.repository";
import {Role} from "./role.interface";
import {AppError} from "../../common/utils/errors";
import Messages from "../../common/utils/messages";

export class RoleService {
    constructor(private roleRepository = new RoleRepository()) {
    }

    /**
     * Retrieves a role by its slug or throws an error if not found
     */
    async getRoleBySlug(slug: string): Promise<Role> {
        const role = await this.roleRepository.findBySlug(slug);

        if (!role) {
            throw new AppError(`Role with slug '${slug}' not found`, Messages.DATA_NOT_FOUND.code, 404);
        }

        return role;
    }
}