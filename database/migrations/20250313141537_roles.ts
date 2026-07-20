// database/migrations/20250313141537_roles.ts

import type {Knex} from "knex";

export async function up(knex: Knex): Promise<void> {
    return knex.schema.createTable('roles', (table) => {
        table.increments('id').primary();

        table.string('name', 100).notNullable();
        table.string('slug', 100).unique().index().notNullable();
        table.text('description').nullable(); // Highly compatible and standard

        // Use true JS booleans; Knex will write 0/1 for SQLite/MySQL and TRUE/FALSE for Postgres
        table.boolean('is_public').notNullable().defaultTo(false);
        table.boolean('is_bypass_authorization').notNullable().defaultTo(false);

        // Standardized on timezone-aware timestamps
        table.timestamp('created_at', {useTz: true}).index().defaultTo(knex.fn.now()).notNullable();
        table.timestamp('updated_at', {useTz: true}).defaultTo(knex.fn.now()).notNullable();
    });
}

export async function down(knex: Knex): Promise<void> {
    return knex.schema.dropTableIfExists('roles');
}