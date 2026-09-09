// src/@types/express/index.d.ts
import "express-useragent";
import {AuthenticationToken} from "../../modules/auth/interfaces/authentication.token";
import {JwtExtendedPayload} from "../../modules/auth/interfaces/jwt.interface";
import {User} from "../../modules/users/user.interface";

export interface RequestCredentials {
    jwt: JwtExtendedPayload;
    user: () => Promise<User>;
    authentication: () => Promise<AuthenticationToken>;
}

export interface SanitizerHelper {
    get: <T = any>(key: string, defaults?: T) => T;
    only: <T extends Record<string, any> = Record<string, any>>(
        keys: string[],
        defaults?: Partial<T>
    ) => T;
    numeric: (key: string, defaults?: number) => number;
}

export interface RequestSanitize {
    body: SanitizerHelper;
    query: SanitizerHelper;
    data?: Record<any, any>;
}

export interface ResponseFailed {
    message: (status: number, message?: string, code?: string) => any;
    fields: (status: number, errors: Record<string, any> | any) => any;
}

/**
 * Traditional page/offset pagination.
 *
 * Keep this because existing endpoints may already depend on it.
 */
export interface RequestPagination {
    page: number;
    offset: number;
    perPage: number;
}

/**
 * Cursor pagination for high-volume endpoints.
 *
 * Cursor is optional because the first request does not have one.
 */
export interface RequestCursorPagination {
    cursor?: number;
    perPage: number;
}

declare global {
    namespace Express {
        export interface Request {
            credentials: RequestCredentials;
            sanitize: RequestSanitize;

            /**
             * Existing offset pagination.
             */
            pagination: RequestPagination;

            /**
             * Cursor pagination.
             */
            cursorPagination: RequestCursorPagination;
        }

        export interface Response {
            failed: ResponseFailed;
        }
    }
}
