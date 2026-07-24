// src/modules/auth/repositories/password-recovery.repository.ts

import {Knex} from "knex";
import {DBKnex} from "../../../config/knex";
import {PasswordRecovery, Type} from "../interfaces/password.recovery.interface";

export const PASSWORD_RECOVERIES_TABLE = "password_recoveries";

export class PasswordRecoveryRepository {
    private readonly db: Knex;

    constructor(db: Knex = DBKnex) {
        this.db = db;
    }

    private get table() {
        return this.db<PasswordRecovery>(PASSWORD_RECOVERIES_TABLE);
    }

    async findBySendTo(sendTo: string): Promise<PasswordRecovery | null> {
        const record = await this.table.where({send_to: sendTo}).first();
        return record || null;
    }

    async upsertRecovery(data: {
        type: Type;
        send_to: string;
        code: string;
        next_resend_at: Date;
        expired_at: Date;
        tries?: number;
        next_try_at?: Date | null;
    }): Promise<PasswordRecovery> {
        const [record] = await this.table
            .insert({
                ...data,
                tries: data.tries ?? 0,
                next_try_at: data.next_try_at ?? null,
            })
            .onConflict("send_to")
            .merge()
            .returning("*");

        return record;
    }

    async updateTries(id: number, tries: number, nextTryAt: Date | null): Promise<void> {
        await this.table.where({id}).update({
            tries,
            next_try_at: nextTryAt,
            updated_at: new Date(),
        });
    }

    async deleteBySendTo(sendTo: string): Promise<boolean> {
        const rows = await this.table.where({send_to: sendTo}).del();
        return rows > 0;
    }
}