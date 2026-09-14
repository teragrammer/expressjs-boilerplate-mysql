import {Router} from "express";
import {AuthenticationMiddleware} from "../../common/middleware/authentication.middleware";
import {AuthorizationMiddleware} from "../../common/middleware/authorization.middleware";
import {validate} from "../../common/middleware/validate.middleware";
import {settingCreateSchema} from "./validations/setting-create.schema";
import {settingUpdateSchema} from "./validations/setting-update.schema";
import {SettingController} from "./controllers/setting.controller";
import {SettingService} from "./services/setting.service";
import {SettingRepository} from "./repositories/setting.repository";
import {redisCache} from "../../config/container";

const settingController = new SettingController(new SettingService(
    new SettingRepository(),
    redisCache,
),);

export default () => {
    const router = Router();

    router.post("/", [
        AuthenticationMiddleware(),
        AuthorizationMiddleware("settings:create"),
        validate(settingCreateSchema, [
            "name", "slug", "value", "description", "type", "is_disabled", "is_public"
        ])
    ], settingController.create);

    router.put("/:id", [
        AuthenticationMiddleware(),
        AuthorizationMiddleware("settings:update"),
        validate((req) => settingUpdateSchema(req.credentials.jwt.uid), [
            "name", "slug", "value", "description", "type", "is_disabled", "is_public"
        ])
    ], settingController.update);

    router.get("/", [AuthenticationMiddleware(), AuthorizationMiddleware("settings:browse")], settingController.browse);

    router.get("/values", [AuthenticationMiddleware()], settingController.values);

    router.get("/:id", [AuthenticationMiddleware(), AuthorizationMiddleware("settings:view")], settingController.view);

    router.delete("/:id", [AuthenticationMiddleware(), AuthorizationMiddleware("settings:delete")], settingController.delete);

    return router;
}