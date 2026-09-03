// src/modules/auth/routes.ts

import {Router} from "express";

import {loginSchema} from "./validations/login.schema";
import {AuthenticationController} from "./controllers/authentication.controller";
import {AuthService} from "./services/auth.service";
import {RegisterController} from "./controllers/register.controller";
import {TwoFactorAuthenticationController} from "./controllers/two-factor-authentication.controller";
import {PasswordRecoveryController} from "./controllers/password-recovery.controller";
import {AuthenticationMiddleware} from "../../common/middleware/authentication.middleware";
import {verifyOtpSchema} from "./validations/two-factor-authentication.validation";
import {validate} from "../../common/middleware/validate.middleware";
import {twoFactorAuthenticationService} from "../../config/container";

const authenticationController = new AuthenticationController(
    new AuthService(),
);

const twoFactorAuthenticationController =
    new TwoFactorAuthenticationController(
        twoFactorAuthenticationService,
    );

export default () => {
    const router = Router();

    router.post("/register", validate(loginSchema, [
        "first_name",
        "middle_name",
        "last_name",
        "username",
        "password",
        "email"
    ]), new RegisterController(
        new AuthService(),
    ).create);

    router.post(
        "/login",
        validate(loginSchema, ["username", "password"]),
        authenticationController.login,
    );

    router.get(
        "/logout",
        AuthenticationMiddleware(),
        authenticationController.logout,
    );

    router.get(
        "/tfa/send",
        AuthenticationMiddleware(),
        twoFactorAuthenticationController.send,
    );

    router.post(
        "/tfa/validate",
        [AuthenticationMiddleware(), validate(verifyOtpSchema, ["code"])],
        twoFactorAuthenticationController.validate,
    );

    router.post(
        "/password-recovery/send",
        PasswordRecoveryController.send,
    );

    router.post(
        "/password-recovery/validate",
        PasswordRecoveryController.validate,
    );

    return router;
};
