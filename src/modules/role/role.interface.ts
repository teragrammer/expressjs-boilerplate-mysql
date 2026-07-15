// src/modules/role/role.interface.ts

export interface Role {
    id: number; // Synchronized with table.increments('id')
    name: string;
    slug: string;
    description: string | null;
    is_public: boolean;
    is_bypass_authorization: boolean;
    created_at: Date;
    updated_at: Date;
}

// Data Transfer Objects (DTOs)
// We omit database-generated values like 'id', 'created_at', and 'updated_at' for creation.
// We make boolean fields optional because they have database-level defaults (0 / false).
export interface CreateRoleDTO {
    name: string;
    slug: string;
    description?: string | null;
    is_public?: boolean;
    is_bypass_authorization?: boolean;
}

export type UpdateRoleDTO = Partial<CreateRoleDTO>;