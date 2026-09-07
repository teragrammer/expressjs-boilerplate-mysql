// src/routes/v1.ts

import {Router} from "express";
import {AuthenticationMiddleware} from "../common/middleware/authentication.middleware";
import {AuthorizationMiddleware} from "../common/middleware/authorization.middleware";
import {TwoFactorAuthenticationMiddleware} from "../common/middleware/two-factor-authentication.middleware";
import AccountController from "../modules/users/controllers/account.controller";
import SettingController from "../modules/system/controllers/setting.controller";
import RoleController from "../modules/role/role.controller";
import UserController from "../modules/users/controllers/user.controller";
import RouteGuardController from "../modules/system/controllers/route-guard.controller";
import authRoutes from "../modules/auth/routes"

export default () => {
    const router = Router();

    router.use("/auth", authRoutes());

    router.put("/account/information", [AuthenticationMiddleware(), TwoFactorAuthenticationMiddleware()], AccountController.information);
    router.put("/account/password", [AuthenticationMiddleware(), TwoFactorAuthenticationMiddleware()], AccountController.password);

    router.get("/settings", [AuthenticationMiddleware(), AuthorizationMiddleware("settings:browse")], SettingController.browse);
    router.get("/settings/values", [AuthenticationMiddleware()], SettingController.values);
    router.get("/settings/:id", [AuthenticationMiddleware(), AuthorizationMiddleware("settings:view")], SettingController.view);
    router.post("/settings", [AuthenticationMiddleware(), AuthorizationMiddleware("settings:create")], SettingController.create);
    router.put("/settings/:id", [AuthenticationMiddleware(), AuthorizationMiddleware("settings:update")], SettingController.update);
    router.delete("/settings/:id", [AuthenticationMiddleware(), AuthorizationMiddleware("settings:delete")], SettingController.delete);

    router.get("/roles", [AuthenticationMiddleware(), AuthorizationMiddleware("roles:browse")], RoleController.browse);
    router.get("/roles/:id", [AuthenticationMiddleware(), AuthorizationMiddleware("roles:view")], RoleController.view);
    router.post("/roles", [AuthenticationMiddleware(), AuthorizationMiddleware("roles:create")], RoleController.create);
    router.put("/roles/:id", [AuthenticationMiddleware(), AuthorizationMiddleware("roles:update")], RoleController.update);
    router.delete("/roles/:id", [AuthenticationMiddleware(), AuthorizationMiddleware("roles:delete")], RoleController.delete);

    router.get("/route/guards", [AuthenticationMiddleware(), AuthorizationMiddleware("route-guards:browse")], RouteGuardController.browse);
    router.get("/route/guards/:id", [AuthenticationMiddleware(), AuthorizationMiddleware("route-guards:view")], RouteGuardController.view);
    router.post("/route/guards", [AuthenticationMiddleware(), AuthorizationMiddleware("route-guards:create")], RouteGuardController.create);
    router.delete("/route/guards/:id", [AuthenticationMiddleware(), AuthorizationMiddleware("route-guards:delete")], RouteGuardController.delete);

    router.get("/users", [AuthenticationMiddleware(), AuthorizationMiddleware("users:browse")], UserController.browse);
    router.get("/users/:id", [AuthenticationMiddleware(), AuthorizationMiddleware("users:view")], UserController.view);
    router.post("/users", [AuthenticationMiddleware(), AuthorizationMiddleware("users:create")], UserController.create);
    router.put("/users/:id", [AuthenticationMiddleware(), AuthorizationMiddleware("users:update")], UserController.update);
    router.delete("/users/:id", [AuthenticationMiddleware(), AuthorizationMiddleware("users:delete")], UserController.delete);

    return router;
}
