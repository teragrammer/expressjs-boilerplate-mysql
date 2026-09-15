// src/modules/roles/roles.interface.ts
// The raw row pulled from Knex DB
export interface RoleRow {
    id: number;
    name: string;
    slug: string;
    description: string | null;
    is_public: number;
    is_bypass_authorization: number;
    created_at: Date | null;
    updated_at: Date | null;
}

export interface Role {
    id: number;
    name: string;
    slug: string;
    description: string | null;
    is_public: boolean;
    is_bypass_authorization: boolean;
    created_at: Date | null;
    updated_at: Date | null;
}

export interface CreateRoleDTO {
    name: string;
    slug: string;
    description?: string | null;
    is_public?: boolean;
    is_bypass_authorization?: boolean;
}

export type UpdateRoleDTO = Partial<CreateRoleDTO>;

export interface BrowseRoleQuery {
    is_public?: boolean;
    search?: string;
    page: number;
    perPage: number;
}
