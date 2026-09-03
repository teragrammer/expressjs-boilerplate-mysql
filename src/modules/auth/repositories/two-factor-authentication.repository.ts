// src/modules/auth/repositories/two-factor-authentication.repository.ts

import {Knex} from "knex";
import {DBKnex} from "../../../config/knex";
import {TwoFactorAuthentication} from "../interfaces/two-factor.authentication";
import {AppError} from "../../../common/utils/errors";
import Messages from "../../../common/utils/messages";

export const TWO_FACTOR_AUTHENTICATION_TABLE =
    "two_factor_authentications";

export class TwoFactorAuthenticationRepository {
    private readonly db: Knex;

    constructor(db: Knex = DBKnex) {
        this.db = db;
    }

    private query() {
        return this.db<TwoFactorAuthentication>(
            TWO_FACTOR_AUTHENTICATION_TABLE,
        );
    }

    public async findByTokenId(
        tokenId: number,
    ): Promise<TwoFactorAuthentication | null> {
        const result = await this.query()
            .where({token_id: tokenId})
            .first();

        return result || null;
    }

    /**
     * Atomically issues or refreshes an OTP.
     *
     * The transaction + row lock prevents two concurrent requests
     * from refreshing the same existing OTP at the same time.
     *
     * The unique token_id constraint handles the special case where
     * two concurrent requests attempt to create the first OTP row.
     */
    public async issueOtp(
        tokenId: number,
        data: {
            code: string;
            expired_at: Date | string;
            next_send_at: Date | string;
            created_at: Date | string;
        },
    ): Promise<TwoFactorAuthentication> {
        return this.db.transaction(async (trx) => {
            const query = () =>
                trx<TwoFactorAuthentication>(
                    TWO_FACTOR_AUTHENTICATION_TABLE,
                );

            let existing = await query()
                .where({token_id: tokenId})
                .forUpdate()
                .first();

            /*
             * First OTP for this token.
             *
             * FOR UPDATE cannot lock a row that doesn't exist, so
             * two concurrent requests can both reach INSERT.
             *
             * The UNIQUE(token_id) constraint guarantees that only
             * one request can actually create the row.
             */
            if (!existing) {
                try {
                    const [created] = await query()
                        .insert({
                            token_id: tokenId,
                            code: data.code,
                            expired_at: data.expired_at,
                            next_send_at: data.next_send_at,
                            created_at: data.created_at,
                        })
                        .returning("*");

                    return created;
                } catch (error) {
                    /*
                     * PostgreSQL unique violation.
                     *
                     * Another request won the race and inserted
                     * the OTP row first.
                     */
                    if (!this.isUniqueViolation(error)) {
                        throw error;
                    }

                    /*
                     * Re-read the row and acquire the row lock.
                     */
                    existing = await query()
                        .where({token_id: tokenId})
                        .forUpdate()
                        .first();

                    if (!existing) {
                        throw error;
                    }
                }
            }

            /*
             * Existing OTP.
             *
             * Because the row is locked with FOR UPDATE, another
             * transaction cannot modify it until this transaction
             * finishes.
             */
            if (
                existing.next_send_at &&
                new Date(existing.next_send_at) > new Date()
            ) {
                throw new AppError(
                    Messages.RESEND_OTP_NOT_POSSIBLE.message,
                    Messages.RESEND_OTP_NOT_POSSIBLE.code,
                    403,
                );
            }

            const [updated] = await query()
                .where({id: existing.id})
                .update({
                    code: data.code,
                    expired_at: data.expired_at,
                    next_send_at: data.next_send_at,
                    updated_at: trx.fn.now(),
                })
                .returning("*");

            return updated;
        });
    }

    /**
     * PostgreSQL unique-constraint violation.
     */
    private isUniqueViolation(error: unknown): boolean {
        return (
            typeof error === "object" &&
            error !== null &&
            "code" in error &&
            (error as { code?: string }).code === "23505"
        );
    }

    /**
     * Increments invalid OTP attempts atomically.
     */
    public async incrementTries(id: number): Promise<void> {
        await this.query()
            .where({id})
            .update({
                tries: this.db.raw("tries + 1"),
                updated_at: this.db.fn.now(),
            });
    }

    /**
     * Resets rate limits once lockout expires.
     */
    public async resetTries(id: number): Promise<void> {
        await this.query()
            .where({id})
            .update({
                tries: 0,
                expired_tries_at: null,
                updated_at: this.db.fn.now(),
            });
    }

    /**
     * Consumes the OTP after successful verification.
     */
    public async deleteById(id: number): Promise<boolean> {
        const rowsAffected = await this.query()
            .where({id})
            .del();

        return rowsAffected > 0;
    }
}
