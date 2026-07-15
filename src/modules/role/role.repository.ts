// src/modules/role/role.repository.ts
import {Knex} from "knex";
import {DBKnex} from "../../config/knex";
import {CreateRoleDTO, Role, UpdateRoleDTO} from "./role.interface";

export const ROLE_TABLE = "roles";

export class RoleRepository {
    private readonly db: Knex;

    // Dependency injection: defaults to production DBKnex, but allows overrides for testing
    constructor(db: Knex = DBKnex) {
        this.db = db;
    }

    // Helper to get typed query builder
    private get table() {
        return this.db<Role>(ROLE_TABLE);
    }

    async findById(id: number): Promise<Role | null> {
        const role = await this.table.where({id}).first();
        return role || null;
    }

    async findBySlug(slug: string): Promise<Role | null> {
        const role = await this.table.where({slug}).first();
        return role || null;
    }

    async create(data: CreateRoleDTO): Promise<Role> {
        const [newRole] = await this.table.insert(data).returning("*");
        return newRole;
    }

    async update(id: number, data: UpdateRoleDTO): Promise<Role | null> {
        const [updatedRole] = await this.table
            .where({id})
            .update({...data, updated_at: new Date()})
            .returning("*");

        return updatedRole || null;
    }

    async delete(id: number): Promise<boolean> {
        const deletedRows = await this.table.where({id}).del();
        return deletedRows > 0;
    }
}