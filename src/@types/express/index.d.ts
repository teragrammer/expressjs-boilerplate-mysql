// src/@types/express/index.d.ts
import {JwtExtendedPayload} from "../../modules/auth/models/authentication-token.model.legacy";
import {UserRole} from "../../modules/users/user.legacy";
import {AuthenticationToken} from "../../modules/auth/interfaces/authentication.token";

export interface RequestCredentials {
    jwt: JwtExtendedPayload;
    user: () => Promise<UserRole>;
    authentication: () => Promise<AuthenticationToken>;
}

export interface RequestSanitize {
    body: {
        get: (key: string, defaults?: any) => any;
        only: (keys: string[], defaults?: Record<string, any> | undefined) => Record<string, any>;
        numeric: (key: string, defaults?: any) => any;
    },
    query: {
        get: (key: string, defaults?: any) => any;
        only: (keys: string[], defaults?: Record<string, any> | undefined) => Record<string, any>;
        numeric: (key: string, defaults?: any) => any;
    },
    data?: any,
}

export interface ResponseFailed {
    message: (status: number, message?: string, code?: string) => any;
    fields: (status: number, errors: any) => any;
}

declare global {
    namespace Express {
        interface Request {
            credentials: RequestCredentials;
            sanitize: RequestSanitize;
        }

        interface Response {
            failed: ResponseFailed;
        }
    }
}