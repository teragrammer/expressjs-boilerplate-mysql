// src/modules/system/repositories/route-guard.repository.ts
import {Knex} from "knex";
import {DBKnex} from "../../../config/knex";
import {RouteGuardRow} from "../interfaces/route-guard.interface";

export class RouteGuardRepository {
    private readonly db: Knex;

    constructor(db: Knex = DBKnex) {
        this.db = db;
    }

    /**
     * Fetches all route guards joined with their respective role slugs in 1 clean query.
     */
    async findRouteGuardsGroupedByRole(): Promise<RouteGuardRow[]> {
        return this.db<RouteGuardRow>("route_guards")
            .join("roles", "route_guards.role_id", "roles.id")
            .select(
                "route_guards.id",
                "route_guards.role_id",
                "route_guards.route",
                "route_guards.created_at",
                "route_guards.updated_at",
                "roles.slug as role_slug"
            );
    }
}