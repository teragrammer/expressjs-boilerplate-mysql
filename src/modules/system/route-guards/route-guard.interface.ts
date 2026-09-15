// src/modules/system/route-guards/route-guard.interface.ts
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

export interface CreateRouteGuardDTO {
    role_id: number;
    route: string;
}

export interface BrowseRouteGuardQuery {
    role_id?: number;
    page: number;
    perPage: number;
}

export type RouteGuardCachePayload = Record<string, string[]>;