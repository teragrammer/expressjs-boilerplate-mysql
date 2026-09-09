// database/migrations/20250313141544_users.ts
import type {Knex} from "knex";
import {GENDERS, STATUSES,} from "../../src/modules/users/user.interface";

export async function up(knex: Knex): Promise<void> {
    return knex.schema.createTable("users", (table) => {
        table.increments("id").primary();

        table.string("first_name", 100).nullable();
        table.string("middle_name", 100).nullable();
        table.string("last_name", 100).nullable();
        table.enum("gender", GENDERS).nullable();

        table.text("address", "tinytext").nullable();

        table.string("phone", 22).unique().nullable();
        table.boolean("is_phone_verified")
            .defaultTo(false)
            .notNullable();

        table.string("email", 180).unique().nullable();
        table.boolean("is_email_verified")
            .defaultTo(false)
            .notNullable();

        table.boolean("has_tfa")
            .defaultTo(false)
            .notNullable();

        table.string("tfa_secret", 100).nullable();

        table.integer("role_id")
            .unsigned()
            .notNullable();

        table.foreign("role_id")
            .references("roles.id")
            .onUpdate("CASCADE")
            .onDelete("CASCADE");

        table.string("username", 16).unique().nullable();

        table.text("password", "tinytext").nullable();

        table.enum("status", STATUSES)
            .defaultTo("Activated")
            .notNullable();

        table.integer("login_tries", 2)
            .unsigned()
            .defaultTo(0)
            .notNullable();

        table.dateTime("failed_login_expired_at").nullable();

        table.text("comments", "tinytext").nullable();

        table.dateTime("created_at")
            .defaultTo(knex.fn.now())
            .notNullable();

        table.dateTime("updated_at")
            .defaultTo(knex.fn.now())
            .notNullable();

        table.dateTime("deleted_at").nullable();

        /*
         * Browse:
         *
         * WHERE deleted_at IS NULL
         *   AND role_id = ?
         *   AND status = ?
         *   AND id < ?
         * ORDER BY id DESC
         * LIMIT ?
         */
        table.index(
            ["deleted_at", "role_id", "status", "id"],
            "idx_users_browse_role_status"
        );

        /*
         * Browse:
         *
         * WHERE deleted_at IS NULL
         *   AND status = ?
         *   AND id < ?
         * ORDER BY id DESC
         * LIMIT ?
         */
        table.index(
            ["deleted_at", "status", "id"],
            "idx_users_browse_status"
        );

        /*
         * Browse:
         *
         * WHERE deleted_at IS NULL
         *   AND role_id = ?
         *   AND id < ?
         * ORDER BY id DESC
         * LIMIT ?
         */
        table.index(
            ["deleted_at", "role_id", "id"],
            "idx_users_browse_role"
        );

        /*
         * Supports queries that specifically filter by deleted_at.
         */
        table.index(
            ["deleted_at", "id"],
            "idx_users_deleted_id"
        );
    });
}

export async function down(knex: Knex): Promise<void> {
    return knex.schema.dropTableIfExists("users");
}
