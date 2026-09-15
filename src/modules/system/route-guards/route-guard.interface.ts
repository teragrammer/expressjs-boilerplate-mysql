// src/modules/system/interfaces/route-guard.interface.ts

export interface RouteGuard {
    id: number;
    role_id: number;
    route: string;
    created_at: string | Date | null;
    updated_at: string | Date | null;
}

export interface RouteGuardRow extends RouteGuard {
    role_slug: string; // Dynamic field fetched via SQL Join
}

export type RouteGuardCachePayload = Record<string, string[]>;