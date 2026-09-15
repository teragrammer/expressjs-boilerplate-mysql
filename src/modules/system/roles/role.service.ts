// src/modules/system/roles/role.service.ts
import {
    BrowseRoleQuery,
    CreateRoleDTO,
    Role,
    UpdateRoleDTO,
} from "./role.interface";
import {RoleRepository} from "./role.repository";
import {AppError} from "../../../common/utils/errors";
import Messages from "../../../common/utils/messages";

export class RoleService {
    constructor(
        private readonly roleRepository: RoleRepository,
    ) {
    }

    /**
     * Retrieves a role by its slug or throws an error if not found.
     */
    async getRoleBySlug(slug: string): Promise<Role> {
        const role = await this.roleRepository.findBySlug(slug);

        if (!role) {
            throw new AppError(
                `Role with slug '${slug}' not found`,
                Messages.DATA_NOT_FOUND.code,
                404,
            );
        }

        return role;
    }

    async createRole(data: CreateRoleDTO): Promise<Role> {
        return this.roleRepository.create(data);
    }

    async updateRole(
        id: number,
        data: UpdateRoleDTO,
    ): Promise<Role> {
        const role: Role | null = await this.roleRepository.update(id, data);

        if (!role) {
            throw new AppError(
                Messages.DATA_NOT_FOUND.message,
                Messages.DATA_NOT_FOUND.code,
                404,
            );
        }

        return role;
    }

    async browseRoles(
        filters: BrowseRoleQuery,
    ): Promise<Role[]> {
        const MAX_PER_PAGE = 100;

        const page = Math.max(
            1,
            filters.page || 1,
        );

        const perPage = Math.min(
            MAX_PER_PAGE,
            Math.max(
                1,
                filters.perPage || 20,
            ),
        );

        const normalizedFilters: BrowseRoleQuery = {
            ...filters,
            page,
            perPage,
            search: filters.search?.trim() || undefined,
        };

        return this.roleRepository.browse(normalizedFilters);
    }

    async findById(id: number): Promise<Role> {
        const role = await this.roleRepository.findById(id);

        if (!role) {
            throw new AppError(
                Messages.DATA_NOT_FOUND.message,
                Messages.DATA_NOT_FOUND.code,
                404,
            );
        }

        return role;
    }

    async hardDelete(id: number): Promise<void> {
        const deleted = await this.roleRepository.delete(id);

        if (!deleted) {
            throw new AppError(
                Messages.DATA_NOT_FOUND.message,
                Messages.DATA_NOT_FOUND.code,
                404,
            );
        }
    }
}
