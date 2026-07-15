export interface UserLegacy {
    id: number;
    first_name: string;
    middle_name: string | null;
    last_name: string;
    gender: string | null;
    address: string | null;
    phone: string | null;
    is_phone_verified: number;
    email: string | null;
    is_email_verified: number;
    role_id: number;
    username: string | null;
    password?: string | null;
    status: string;
    comments: string | null;
    login_tries?: number;
    failed_login_expired_at?: string | null;
    created_at: string | null;
    updated_at: string | null;
}

export interface UserRole extends UserLegacy {
    slug?: string;
    is_public?: number;
    is_bypass_authorization?: number;
}