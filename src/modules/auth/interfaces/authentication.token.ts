// src/modules/auth/interfaces/authentication.token.ts

export interface AuthenticationToken {
    id: number;
    user_id: number | null;
    tries?: number;
    expired_at: Date | string | null;
    ip: string | null;
    browser: string | null;
    os: string | null;
    created_at: Date | string | null;
    updated_at: Date | string | null;
}

export type CreateAuthenticationTokenInput = Omit<AuthenticationToken, "id" | "created_at" | "updated_at">;
export type UpdateAuthenticationTokenInput = Partial<CreateAuthenticationTokenInput>;