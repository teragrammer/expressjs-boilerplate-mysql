// src/@types/express/index.d.ts

import {AuthenticationToken} from "../../modules/auth/interfaces/authentication.token";
import {JwtExtendedPayload} from "../../modules/auth/interfaces/jwt.interface";
import {UserRole} from "../../modules/users/user.legacy";

export interface RequestCredentials {
    jwt: JwtExtendedPayload;
    user: () => Promise<UserRole>;
    authentication: () => Promise<AuthenticationToken>;
}

// DRYs up the duplicate body and query structures, and adds Generics <T>
// so if you pass a default number, TypeScript knows the return is a number.
export interface SanitizerHelper {
    get: <T = any>(key: string, defaults?: T) => T;
    only: <T extends Record<string, any> = Record<string, any>>(keys: string[], defaults?: Partial<T>) => T;
    numeric: (key: string, defaults?: number) => number;
}

export interface RequestSanitize {
    body: SanitizerHelper;
    query: SanitizerHelper;
    data?: any;
}

export interface ResponseFailed {
    message: (status: number, message?: string, code?: string) => any;
    fields: (status: number, errors: Record<string, any> | any) => any;
}

export interface RequestPagination {
    offset: number;
    perPage: number;
}

// Explicitly declare merging on the Express module
declare global {
    namespace Express {
        export interface Request {
            credentials: RequestCredentials;
            sanitize: RequestSanitize;
            pagination: RequestPagination;
        }

        export interface Response {
            failed: ResponseFailed;
        }
    }
}