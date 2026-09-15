// src/modules/system/route-guards/route-guard.repository.ts
import {Knex} from "knex";
import {DBKnex} from "../../../config/knex";
import {BrowseRouteGuardQuery, CreateRouteGuardDTO, RouteGuard, RouteGuardRow,} from "./route-guard.interface";
import {ROLE_TABLE} from "../roles/role.repository";

export const ROUTE_GUARD_TABLE = "route_guards";

export class RouteGuardRepository {
    private readonly db: Knex;

    constructor(db: Knex = DBKnex) {
        this.db = db;
    }

    /**
     * Typed route guards table query builder.
     */
    private get table() {
        return this.db<RouteGuardRow>(ROUTE_GUARD_TABLE);
    }

    /**
     * Columns returned when a route guard is queried together
     * with its role information.
     */
    private static readonly joinedSelect = [
        `${ROUTE_GUARD_TABLE}.id`,
        `${ROUTE_GUARD_TABLE}.role_id`,
        `${ROUTE_GUARD_TABLE}.route`,
        `${ROUTE_GUARD_TABLE}.created_at`,
        `${ROUTE_GUARD_TABLE}.updated_at`,
        `${ROLE_TABLE}.slug as role_slug`,
    ];

    /**
     * Base query for route guards that require role information.
     *
     * Keeping the join in one place prevents the same join and
     * select list from being duplicated across repository methods.
     */
    private get joinedTable() {
        return this.table
            .join(
                ROLE_TABLE,
                `${ROUTE_GUARD_TABLE}.role_id`,
                `${ROLE_TABLE}.id`,
            )
            .select(RouteGuardRepository.joinedSelect);
    }

    async create(data: CreateRouteGuardDTO): Promise<RouteGuard> {
        const insertPayload: Partial<RouteGuard> = {
            role_id: data.role_id,
            route: data.route,
        };

        const [newRow] = await this.table
            .insert(insertPayload)
            .returning("*");

        return newRow;
    }

    async browse(
        filters: BrowseRouteGuardQuery,
    ): Promise<RouteGuardRow[]> {
        const {
            role_id,
            page,
            perPage,
        } = filters;

        const offset = (page - 1) * perPage;

        let query = this.joinedTable;

        if (role_id !== undefined) {
            query = query.where(
                `${ROUTE_GUARD_TABLE}.role_id`,
                role_id,
            );
        }

        return query
            .orderBy(
                `${ROUTE_GUARD_TABLE}.id`,
                "desc",
            )
            .offset(offset)
            .limit(perPage);
    }

    /**
     * Fetches all route guards with their role slugs.
     *
     * Used to build the authorization cache.
     */
    async findRouteGuardsGroupedByRole(): Promise<RouteGuardRow[]> {
        return this.joinedTable;
    }

    async findById(id: number): Promise<RouteGuardRow | null> {
        return this.joinedTable
            .where(`${ROUTE_GUARD_TABLE}.id`, id)
            .first();
    }

    async delete(id: number): Promise<boolean> {
        const deletedRows = await this.table
            .where({id})
            .del();

        return deletedRows > 0;
    }
}
