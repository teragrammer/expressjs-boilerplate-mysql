// src/modules/auth/interfaces/two-factor.authentication.ts

export interface TwoFactorAuthentication {
    id: number;
    token_id: number | null;
    code: string;
    tries: number;
    next_send_at: string | Date | null;
    expired_tries_at: string | Date | null;
    expired_at: string | Date | null;
    created_at: string | Date;
    updated_at: string | Date;
}