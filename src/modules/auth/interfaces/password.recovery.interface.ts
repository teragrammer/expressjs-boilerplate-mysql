// src/modules/auth/interfaces/password.recovery.interface.ts

export const RECOVERY_EMAIL = "email";
export const RECOVERY_PHONE = "phone";
export const TYPES = [RECOVERY_EMAIL, RECOVERY_PHONE] as const;
export type Type = (typeof TYPES)[number];

export interface PasswordRecovery {
    id: number;
    type: Type;
    send_to: string;
    code: string;
    next_resend_at: Date | string;
    expired_at: Date | string;
    tries: number;
    next_try_at: Date | string | null;
    created_at: Date | string | null;
    updated_at: Date | string | null;
}