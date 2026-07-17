// src/modules/auth/repositories/authentication-token.repository.ts

import {Knex} from "knex";
import {DBKnex} from "../../../config/knex";
import {
    AuthenticationToken,
    CreateAuthenticationTokenInput,
    UpdateAuthenticationTokenInput
} from "../interfaces/authentication.token";

export const AUTHENTICATION_TOKEN_TABLE = "authentication_tokens";

export class AuthenticationTokenRepository {
    private readonly db: Knex;

    constructor(db: Knex = DBKnex) {
        this.db = db;
    }

    /**
     * Creates a query builder context pointing directly to the target table.
     */
    private query() {
        return this.db<AuthenticationToken>(AUTHENTICATION_TOKEN_TABLE);
    }

    /**
     * Persists a new authentication token record in the database.
     */
    public async create(data: CreateAuthenticationTokenInput): Promise<AuthenticationToken> {
        const [insertedToken] = await this.query()
            .insert(data)
            .returning("*"); // Fully compatible with PostgreSQL/SQLite. For MySQL, fallback or manual lookup may be needed.

        return insertedToken;
    }

    /**
     * Retrieves an active, unexpired token record by its ID.
     */
    public async findById(id: number): Promise<AuthenticationToken | null> {
        const token = await this.query()
            .where({id})
            .first();

        return token || null;
    }

    /**
     * Finds all active tokens associated with a specific user.
     */
    public async findByUserId(userId: number): Promise<AuthenticationToken[]> {
        return this.query()
            .where({user_id: userId})
            .orderBy("created_at", "desc");
    }

    /**
     * Partially updates an existing token record by its ID.
     */
    public async update(id: number, data: UpdateAuthenticationTokenInput): Promise<AuthenticationToken | null> {
        const [updatedToken] = await this.query()
            .where({id})
            .update({
                ...data,
                updated_at: this.db.fn.now() // Dynamically handles SQL-native date updates
            })
            .returning("*");

        return updatedToken || null;
    }

    /**
     * Deletes a single token record by its primary ID.
     */
    public async deleteById(id: number): Promise<boolean> {
        const rowsAffected = await this.query()
            .where({id})
            .del();

        return rowsAffected > 0;
    }

    /**
     * Revokes (deletes) all active tokens linked to a specific user.
     * Essential for security workflows like password resets, forcing user logout everywhere.
     */
    public async deleteAllByUserId(userId: number): Promise<number> {
        return this.query()
            .where({user_id: userId})
            .del();
    }

    /**
     * Automatically purges obsolete or expired session tokens from the table.
     * Prevents system scaling bottlenecks and table bloat.
     */
    public async purgeExpiredTokens(): Promise<number> {
        return this.query()
            .where("expired_at", "<", this.db.fn.now())
            .del();
    }
}