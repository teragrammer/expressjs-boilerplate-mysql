import {Router} from "express";
import {AuthenticationMiddleware} from "../../common/middleware/authentication.middleware";
import {AuthorizationMiddleware} from "../../common/middleware/authorization.middleware";
import UserController from "./controllers/user.controller";

export default () => {
    const router = Router();

    router.get("/users", [AuthenticationMiddleware(), AuthorizationMiddleware("users:browse")], UserController.browse);
    router.get("/users/:id", [AuthenticationMiddleware(), AuthorizationMiddleware("users:view")], UserController.view);
    router.post("/users", [AuthenticationMiddleware(), AuthorizationMiddleware("users:create")], UserController.create);
    router.put("/users/:id", [AuthenticationMiddleware(), AuthorizationMiddleware("users:update")], UserController.update);
    router.delete("/users/:id", [AuthenticationMiddleware(), AuthorizationMiddleware("users:delete")], UserController.delete);

    return router;
}