// src/modules/roles/role.interface.ts

// The raw row pulled from Knex DB
export interface RoleRow {
    id: number;
    name: string;
    slug: string;
    description: string | null;
    is_public: number; // 0 or 1 in standard DB driver queries
    is_bypass_authorization: number; // 0 or 1
    created_at: Date | null;
    updated_at: Date | null;
}

// Clean domain model used throughout your Express controllers and services
export interface Role {
    id: number;
    name: string;
    slug: string;
    description: string | null;
    is_public: boolean; // Map to true native booleans
    is_bypass_authorization: boolean;
    created_at: Date | null;
    updated_at: Date | null;
}

// Data Transfer Objects (DTOs)
export interface CreateRoleDTO {
    name: string;
    slug: string;
    description?: string | null;
    is_public?: boolean;
    is_bypass_authorization?: boolean;
}

export type UpdateRoleDTO = Partial<CreateRoleDTO>;