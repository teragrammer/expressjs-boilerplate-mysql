// database/migrations/20250313141609_two_factor_authentications.ts

import type {Knex} from "knex";

export async function up(knex: Knex): Promise<void> {
    return knex.schema.createTable('two_factor_authentications', (table) => {
        table.bigIncrements('id').primary();

        // Foreign Key
        table.bigInteger('token_id')
            .unsigned()
            .nullable()
            .unique();

        table.foreign('token_id')
            .references('id')
            .inTable('authentication_tokens')
            .onUpdate('CASCADE')
            .onDelete('CASCADE');

        // FIX: Increased to 60 characters to fit standard Bcrypt hashes securely
        table.string('code', 60).notNullable();
        table.integer('tries').unsigned().defaultTo(0).notNullable();

        // Timezone-Consistent Date Fields
        table.timestamp('next_send_at', {useTz: true}).nullable();
        table.timestamp('expired_tries_at', {useTz: true}).nullable();
        table.timestamp('expired_at', {useTz: true}).nullable();

        // Record Timestamps
        table.timestamp('created_at', {useTz: true}).defaultTo(knex.fn.now()).notNullable();
        table.timestamp('updated_at', {useTz: true}).defaultTo(knex.fn.now()).notNullable();

        // Compound Index
        table.index(['token_id', 'expired_at'], 'idx_2fa_token_expiration');
    });
}

export async function down(knex: Knex): Promise<void> {
    return knex.schema.dropTableIfExists('two_factor_authentications');
}