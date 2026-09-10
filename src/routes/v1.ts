// src/routes/v1.ts

import {Router} from "express";
import {AuthenticationMiddleware} from "../common/middleware/authentication.middleware";
import {AuthorizationMiddleware} from "../common/middleware/authorization.middleware";
import RoleController from "../modules/role/role.controller";
import RouteGuardController from "../modules/system/controllers/route-guard.controller";

import authRoutes from "../modules/auth/routes"
import accountRoutes from "../modules/users/account.routes"
import userRoutes from "../modules/users/user.routes";
import settingRoutes from "../modules/system/setting.routes";

export default () => {
    const router = Router();

    router.use("/auth", authRoutes());
    router.use("/account", accountRoutes());
    router.use("/users", userRoutes());
    router.use("/settings", settingRoutes());

    router.get("/roles", [AuthenticationMiddleware(), AuthorizationMiddleware("roles:browse")], RoleController.browse);
    router.get("/roles/:id", [AuthenticationMiddleware(), AuthorizationMiddleware("roles:view")], RoleController.view);
    router.post("/roles", [AuthenticationMiddleware(), AuthorizationMiddleware("roles:create")], RoleController.create);
    router.put("/roles/:id", [AuthenticationMiddleware(), AuthorizationMiddleware("roles:update")], RoleController.update);
    router.delete("/roles/:id", [AuthenticationMiddleware(), AuthorizationMiddleware("roles:delete")], RoleController.delete);

    router.get("/route/guards", [AuthenticationMiddleware(), AuthorizationMiddleware("route-guards:browse")], RouteGuardController.browse);
    router.get("/route/guards/:id", [AuthenticationMiddleware(), AuthorizationMiddleware("route-guards:view")], RouteGuardController.view);
    router.post("/route/guards", [AuthenticationMiddleware(), AuthorizationMiddleware("route-guards:create")], RouteGuardController.create);
    router.delete("/route/guards/:id", [AuthenticationMiddleware(), AuthorizationMiddleware("route-guards:delete")], RouteGuardController.delete);

    return router;
}
