// src/modules/system/roles/role.repository.ts
import {Knex} from "knex";
import {DBKnex} from "../../../config/knex";
import {
    BrowseRoleQuery,
    CreateRoleDTO,
    Role,
    RoleRow,
    UpdateRoleDTO,
} from "./role.interface";

export const ROLE_TABLE = "roles";

export class RoleRepository {
    private readonly db: Knex;

    /**
     * Constructor defaults to the application's Knex instance,
     * but allows dependency injection for tests.
     */
    constructor(db: Knex = DBKnex) {
        this.db = db;
    }

    /**
     * Typed roles table query builder.
     */
    private get table() {
        return this.db<RoleRow>(ROLE_TABLE);
    }

    /**
     * Convert a database row into the application/domain representation.
     */
    private mapToRole(row: RoleRow): Role {
        return {
            ...row,
            is_public: Boolean(row.is_public),
            is_bypass_authorization: Boolean(row.is_bypass_authorization),
        };
    }

    async findById(id: number): Promise<Role | null> {
        const row = await this.table
            .select([
                "id",
                "name",
                "slug",
                "description",
                "is_public",
                "is_bypass_authorization",
                "created_at",
                "updated_at",
            ])
            .where({id})
            .first();

        return row
            ? this.mapToRole(row)
            : null;
    }

    async findBySlug(slug: string): Promise<Role | null> {
        const row = await this.table
            .where({slug})
            .first();

        return row
            ? this.mapToRole(row)
            : null;
    }

    async create(data: CreateRoleDTO): Promise<Role> {
        const insertPayload: Partial<RoleRow> = {
            name: data.name,
            slug: data.slug,
            description: data.description || null,
            is_public: data.is_public ? 1 : 0,
            is_bypass_authorization: data.is_bypass_authorization ? 1 : 0,
        };

        const [newRow] = await this.table
            .insert(insertPayload)
            .returning("*");

        return this.mapToRole(newRow);
    }

    async update(
        id: number,
        data: UpdateRoleDTO,
    ): Promise<Role | null> {
        const updatePayload: Partial<RoleRow> = {
            ...(data.name !== undefined && {
                name: data.name,
            }),
            ...(data.slug !== undefined && {
                slug: data.slug,
            }),
            ...(data.description !== undefined && {
                description: data.description || null,
            }),
            ...(data.is_public !== undefined && {
                is_public: data.is_public ? 1 : 0,
            }),
            ...(data.is_bypass_authorization !== undefined && {
                is_bypass_authorization: data.is_bypass_authorization ? 1 : 0,
            }),
            updated_at: new Date(),
        };

        const [updatedRow] = await this.table
            .where({id})
            .update(updatePayload)
            .returning("*");

        return updatedRow
            ? this.mapToRole(updatedRow)
            : null;
    }

    async browse(
        filters: BrowseRoleQuery,
    ): Promise<Role[]> {
        const {
            is_public,
            search,
            page,
            perPage,
        } = filters;

        const offset = (page - 1) * perPage;

        let query = this.table
            .select([
                "id",
                "name",
                "slug",
                "description",
                "is_public",
                "is_bypass_authorization",
                "created_at",
                "updated_at",
            ]);

        if (is_public !== undefined) {
            query = query.where(
                "is_public",
                is_public ? 1 : 0,
            );
        }

        if (search !== undefined && search.length > 0) {
            const keyword = `%${search}%`;

            query = query.where(builder => {
                builder
                    .where("name", "LIKE", keyword)
                    .orWhere("slug", "LIKE", keyword)
                    .orWhere("description", "LIKE", keyword);
            });
        }

        const rows = await query
            .orderBy("id", "desc")
            .offset(offset)
            .limit(perPage);

        return rows.map(row => this.mapToRole(row));
    }

    async delete(id: number): Promise<boolean> {
        const deletedRows = await this.table
            .where({id})
            .del();

        return deletedRows > 0;
    }
}
