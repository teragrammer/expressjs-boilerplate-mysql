// src/modules/auth/repositories/two-factor-authentication.repository.ts

import {Knex} from "knex";
import {DBKnex} from "../../../config/knex";
import {TwoFactorAuthentication} from "../interfaces/two-factor.authentication";

export const TWO_FACTOR_AUTHENTICATION_TABLE = "two_factor_authentications";

export class TwoFactorAuthenticationRepository {
    private readonly db: Knex;

    constructor(db: Knex = DBKnex) {
        this.db = db;
    }

    private query() {
        return this.db<TwoFactorAuthentication>(TWO_FACTOR_AUTHENTICATION_TABLE);
    }

    public async findByTokenId(tokenId: number): Promise<TwoFactorAuthentication | null> {
        const result = await this.query().where({token_id: tokenId}).first();
        return result || null;
    }

    public async create(data: Partial<TwoFactorAuthentication>): Promise<TwoFactorAuthentication> {
        const [inserted] = await this.query()
            .insert(data)
            .returning("*");
        return inserted;
    }

    public async update(id: number, data: Partial<TwoFactorAuthentication>): Promise<TwoFactorAuthentication | null> {
        const [updated] = await this.query()
            .where({id})
            .update({
                ...data,
                updated_at: this.db.fn.now()
            })
            .returning("*");
        return updated || null;
    }

    /**
     * Increments the invalid OTP entry attempts atomically.
     */
    public async incrementTries(id: number): Promise<void> {
        await this.query()
            .where({id})
            .update({
                tries: this.db.raw("tries + 1"),
                updated_at: this.db.fn.now()
            });
    }

    /**
     * Resets rate limits once verification is cleared or lockout expires.
     */
    public async resetTries(id: number): Promise<void> {
        await this.query()
            .where({id})
            .update({
                tries: 0,
                expired_tries_at: null,
                updated_at: this.db.fn.now()
            });
    }

    /**
     * Deletes a single 2FA record by its primary ID.
     * Used to securely consume the OTP after validation success.
     */
    public async deleteById(id: number): Promise<boolean> {
        const rowsAffected = await this.query()
            .where({id})
            .del();

        return rowsAffected > 0;
    }
}