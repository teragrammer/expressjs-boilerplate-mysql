// database/migrations/20250313141523_settings.ts
import type { Knex } from "knex";
import { DATA_TYPES } from "../../src/modules/system/models/setting.model";

export async function up(knex: Knex): Promise<void> {
    return knex.schema.createTable("settings", table => {
        table.increments("id").primary();

        table.string("name", 100).unique().notNullable();

        table
            .string("slug", 100)
            .unique()
            .notNullable();

        table.text("value").nullable();

        table.text("description").nullable();

        table
            .enum("type", DATA_TYPES)
            .notNullable()
            .defaultTo("string");

        table
            .boolean("is_disabled")
            .notNullable()
            .defaultTo(false);

        table
            .boolean("is_public")
            .notNullable()
            .defaultTo(true);

        table
            .dateTime("created_at")
            .notNullable()
            .defaultTo(knex.fn.now());

        table
            .dateTime("updated_at")
            .notNullable()
            .defaultTo(knex.fn.now());
    });
}

export async function down(knex: Knex): Promise<void> {
    return knex.schema.dropTable("settings");
}
