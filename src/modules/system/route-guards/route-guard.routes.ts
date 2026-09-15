// src/modules/system/roles/role.routes.ts
import {Router} from "express";
import {AuthenticationMiddleware} from "../../../common/middleware/authentication.middleware";
import {AuthorizationMiddleware} from "../../../common/middleware/authorization.middleware";
import {validate} from "../../../common/middleware/validate.middleware";
import {RouteGuardController} from "./route-guard.controller";
import {routeGuardCreateSchema} from "./route-guard-create.schema";
import {routeGuardService} from "../../../config/container";

const roleController = new RouteGuardController(routeGuardService);

export default () => {
    const router = Router();

    router.post("/", [
        AuthenticationMiddleware(),
        AuthorizationMiddleware("route-guards:create"),
        validate(routeGuardCreateSchema, [
            "role_id", "route"
        ])
    ], roleController.create);

    router.get("/route/guards", [AuthenticationMiddleware(), AuthorizationMiddleware("route-guards:browse")], roleController.browse);

    router.get("/route/guards/:id", [AuthenticationMiddleware(), AuthorizationMiddleware("route-guards:view")], roleController.view);

    router.delete("/route/guards/:id", [AuthenticationMiddleware(), AuthorizationMiddleware("route-guards:delete")], roleController.delete);

    return router;
}