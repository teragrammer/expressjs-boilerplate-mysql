// database/migrations/20251023075024_route_guards.ts

import type {Knex} from "knex";

export async function up(knex: Knex): Promise<void> {
    return knex.schema.createTable("route_guards", (table) => {
        table.increments("id").primary();

        table.integer("role_id").unsigned().notNullable();
        table
            .foreign("role_id")
            .references("id")
            .inTable("roles")
            .onUpdate("CASCADE")
            .onDelete("CASCADE");

        table.string("route", 100).notNullable();

        // Use non-nullable defaults for audit timestamps
        table.dateTime("created_at").defaultTo(knex.fn.now()).notNullable();
        table.dateTime("updated_at").defaultTo(knex.fn.now()).notNullable();
    });
}

export async function down(knex: Knex): Promise<void> {
    return knex.schema.dropTableIfExists("route_guards");
}