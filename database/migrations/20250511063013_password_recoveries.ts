// database/migrations/20250511063013_password_recoveries.ts

import type {Knex} from "knex";
import {TYPES} from "../../src/modules/auth/interfaces/password.recovery.interface";

export async function up(knex: Knex): Promise<void> {
    await knex.schema.createTable("password_recoveries", (table) => {
        table.increments("id").primary();

        // Pass as readonly array to enum builder
        table.enum("type", [...TYPES]).notNullable();
        table.string("send_to", 100).notNullable().unique().index();
        table.string("code", 100).notNullable();

        table.timestamp("next_resend_at", {useTz: true}).notNullable().index();
        table.timestamp("expired_at", {useTz: true}).notNullable().index();

        table.integer("tries").notNullable().defaultTo(0);
        table.timestamp("next_try_at", {useTz: true}).nullable().index();

        // Standard created_at and updated_at handled cleanly
        table.timestamps(true, true);
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists("password_recoveries");
}