// src/modules/system/repositories/setting.repository.ts
import {Knex} from "knex";
import {DBKnex} from "../../../config/knex";
import {
    BrowseSettingQuery,
    CreateSettingDTO,
    Setting,
    SettingRow,
    UpdateSettingDTO,
} from "../interfaces/setting.interface";

export const SETTING_TABLE = "settings";

export class SettingRepository {
    private readonly db: Knex;

    /**
     * Constructor defaults to the application's Knex instance,
     * but allows dependency injection for tests.
     */
    constructor(db: Knex = DBKnex) {
        this.db = db;
    }

    /**
     * Typed settings table query builder.
     */
    private get table() {
        return this.db<SettingRow>(SETTING_TABLE);
    }

    /**
     * Convert a database row into the application/domain representation.
     */
    private mapToSetting(row: SettingRow): Setting {
        return {
            ...row,
            is_disabled: Boolean(row.is_disabled),
            is_public: Boolean(row.is_public),
        };
    }

    /**
     * Retrieves active settings filtered by slugs and visibility.
     */
    async findBySlug(
        slugs: string[] = [],
        is_public?: boolean,
    ): Promise<Setting[]> {
        let query = this.table.where("is_disabled", 0);

        if (is_public !== undefined) {
            query = query.where("is_public", is_public ? 1 : 0);
        }

        if (slugs.length > 0) {
            query = query.whereIn("slug", slugs);
        }

        const rows = await query;

        return rows.map(row => this.mapToSetting(row));
    }

    /**
     * Creates a new setting.
     *
     * MySQL does not support PostgreSQL-style RETURNING,
     * so we insert first and then retrieve the inserted row
     * using the generated primary key.
     */
    async create(data: CreateSettingDTO): Promise<Setting> {
        const insertPayload: Partial<SettingRow> = {
            name: data.name,
            slug: data.slug,
            value: data.value,
            description: data.description,
            type: data.type,
            is_disabled: data.is_disabled ? 1 : 0,
            is_public: data.is_public === false ? 0 : 1,
        };

        const [newRow] = await this.table
            .insert(insertPayload)
            .returning("*");

        return this.mapToSetting(newRow);
    }

    async update(
        id: number,
        data: UpdateSettingDTO,
    ): Promise<Setting | null> {
        const existingRow = await this.table
            .select("id")
            .where("id", id)
            .first();

        if (!existingRow) {
            return null;
        }

        const updatePayload: Partial<SettingRow> = {
            ...(data.name !== undefined && {
                name: data.name,
            }),
            ...(data.slug !== undefined && {
                slug: data.slug,
            }),
            ...(data.value !== undefined && {
                value: data.value,
            }),
            ...(data.description !== undefined && {
                description: data.description,
            }),
            ...(data.type !== undefined && {
                type: data.type,
            }),
            ...(data.is_disabled !== undefined && {
                is_disabled: data.is_disabled ? 1 : 0,
            }),
            ...(data.is_public !== undefined && {
                is_public: data.is_public ? 1 : 0,
            }),
            updated_at: new Date(),
        };

        await this.table
            .where("id", id)
            .update(updatePayload);

        const updatedRow = await this.table
            .where("id", id)
            .first();

        return updatedRow
            ? this.mapToSetting(updatedRow)
            : null;
    }

    async browse(
        filters: BrowseSettingQuery,
    ): Promise<Setting[]> {
        const {
            is_disabled,
            is_public,
            type,
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
                "value",
                "description",
                "type",
                "is_disabled",
                "is_public",
                "created_at",
                "updated_at",
            ]);

        if (is_disabled !== undefined) {
            query = query.where("is_disabled", is_disabled ? 1 : 0);
        }

        if (is_public !== undefined) {
            query = query.where("is_public", is_public ? 1 : 0);
        }

        if (type !== undefined) {
            query = query.where("type", type);
        }

        if (search !== undefined && search.length > 0) {
            const keyword = `%${search}%`;

            query = query.where(builder => {
                builder
                    .where("name", "LIKE", keyword)
                    .orWhere("slug", "LIKE", keyword)
                    .orWhere("value", "LIKE", keyword);
            });
        }

        return query
            .orderBy("id", "desc")
            .offset(offset)
            .limit(perPage)
            .then(rows => rows.map(row => this.mapToSetting(row)));
    }

    async findById(id: number): Promise<Setting | null> {
        const row = await this.table
            .select([
                "id",
                "name",
                "slug",
                "value",
                "description",
                "type",
                "is_disabled",
                "is_public",
                "created_at",
                "updated_at",
            ])
            .where("id", id)
            .first();

        return row
            ? this.mapToSetting(row)
            : null;
    }

    async hardDelete(id: number): Promise<boolean> {
        const deletedRows = await this.table
            .where({id})
            .del();

        return deletedRows > 0;
    }
}
