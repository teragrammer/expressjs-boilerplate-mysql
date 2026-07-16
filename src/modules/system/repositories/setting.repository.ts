// src/modules/system/repositories/setting.repository.ts

import {Knex} from "knex";
import {DBKnex} from "../../../config/knex";
import {SettingRow} from "../interfaces/setting.interface";

export const SETTING_TABLE = "settings";

export class SettingRepository {
    private readonly db: Knex;

    // Constructor defaults to DBKnex but allows injecting any Knex instance (e.g., in-memory SQLite for integration tests)
    constructor(db: Knex = DBKnex) {
        this.db = db;
    }

    /**
     * Helper to fetch the typed table query builder.
     */
    private get table() {
        return this.db<SettingRow>(SETTING_TABLE);
    }

    /**
     * Retrieves active settings filtered by slugs and visibility status.
     */
    async findBySlug(slugs: string[] = [], is_public?: number): Promise<SettingRow[]> {
        // Build base query using 'this.db' via the helper, filtering out disabled settings
        const query = this.table.where("is_disabled", false);

        // Safely apply visibility filter if provided
        if (is_public !== undefined) {
            query.where("is_public", is_public === 1);
        }

        // Apply slug filter if the array is populated
        if (slugs.length > 0) {
            query.whereIn("slug", slugs);
        }

        return query;
    }
}