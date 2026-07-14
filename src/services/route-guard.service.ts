import {Role} from "../interfaces/role";
import {RoleModel} from "../models/role.model";
import {RouteGuard} from "../interfaces/route.guard";
import {RouteGuardModel} from "../models/route-guard.model";
import RedisPublisherService from "./redis-publisher.service";
import {__ENV} from "../config/environment";

class RouteGuardService {
    private static instance: RouteGuardService;

    private cache?: Record<string, string[]>;

    private constructor() {
    }

    static getInstance(): RouteGuardService {
        if (!RouteGuardService.instance) RouteGuardService.instance = new RouteGuardService();
        return RouteGuardService.instance;
    }

    async initializer(): Promise<Record<string, string[]>> {
        const GUARDS: Record<string, string[]> = {};

        const ROLES: Role[] = await RoleModel().table().select(["id", "slug"]);
        for (const role of ROLES) {
            const ROUTE_GUARDS: RouteGuard[] = await RouteGuardModel().table().select("route").where("role_id", role.id);
            for (const routeGuard of ROUTE_GUARDS) {
                if (typeof GUARDS[role.slug] === "undefined") GUARDS[role.slug] = [];
                GUARDS[role.slug].push(routeGuard.route);
            }
        }

        return GUARDS;
    }

    setCache(data: any) {
        this.cache = data;
    }

    async getCache(): Promise<Record<string, string[]>> {
        if (!RedisPublisherService.isConnected() && __ENV.CLUSTER) return Object.freeze(await this.initializer());

        if (this.cache) return Object.freeze(this.cache);

        return Object.freeze(await this.boot());
    }

    async boot(): Promise<Record<string, string[]>> {
        const GUARD: Record<string, string[]> = await this.initializer();

        this.setCache(GUARD);

        return GUARD;
    }
}

export default RouteGuardService.getInstance();