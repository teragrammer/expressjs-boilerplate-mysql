// src/modules/auth/account.routes.ts
import {Router} from "express";

import {loginSchema} from "./validations/login.schema";
import {AuthenticationController} from "./controllers/authentication.controller";
import {RegisterController} from "./controllers/register.controller";
import {TwoFactorAuthenticationController} from "./controllers/two-factor-authentication.controller";
import {PasswordRecoveryController} from "./controllers/password-recovery.controller";

import {AuthenticationMiddleware} from "../../common/middleware/authentication.middleware";
import {verifyOtpSchema} from "./validations/two-factor-authentication.validation";
import {validate} from "../../common/middleware/validate.middleware";

import {authService, passwordRecoveryService, twoFactorAuthenticationService,} from "../../config/container";

import {passwordRecoverySendSchema} from "./validations/password-recovery-send.schema";
import {passwordRecoveryValidateSchema} from "./validations/password-recovery-validate.schema";

const authenticationController =
    new AuthenticationController(authService);

const registerController =
    new RegisterController(authService);

const twoFactorAuthenticationController =
    new TwoFactorAuthenticationController(
        twoFactorAuthenticationService,
    );

const passwordRecoveryController =
    new PasswordRecoveryController(
        passwordRecoveryService,
    );

export default () => {
    const router = Router();

    router.post(
        "/register",
        validate(loginSchema, [
            "first_name",
            "middle_name",
            "last_name",
            "username",
            "password",
            "email",
        ]),
        registerController.create,
    );

    router.post(
        "/login",
        validate(loginSchema, [
            "username",
            "password",
        ]),
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
        [
            AuthenticationMiddleware(),
            validate(verifyOtpSchema, ["code"]),
        ],
        twoFactorAuthenticationController.validate,
    );

    router.post(
        "/password-recovery/send",
        validate(
            passwordRecoverySendSchema,
            ["type", "send_to"],
        ),
        passwordRecoveryController.send,
    );

    router.post(
        "/password-recovery/validate",
        validate(
            passwordRecoveryValidateSchema,
            [
                "type",
                "send_to",
                "code",
                "new_password",
            ],
        ),
        passwordRecoveryController.validate,
    );

    return router;
};
