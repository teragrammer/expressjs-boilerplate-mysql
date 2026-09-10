// src/config/container.ts

import {DBKnex} from "./knex";
import {DBRedis} from "./redis";
import {logger} from "./logger";
import {__ENV} from "./environment";
import {SecurityUtil} from "../common/utils/security.util";
import {DateUtil} from "../common/utils/date.util";

// Repositories
import {SettingRepository} from "../modules/system/repositories/setting.repository";
import {RouteGuardRepository} from "../modules/system/repositories/route-guard.repository";
import {TwoFactorAuthenticationRepository} from "../modules/auth/repositories/two-factor-authentication.repository";
import {AuthenticationTokenRepository} from "../modules/auth/repositories/authentication-token.repository";

// Shared Cache Elements
import {RedisCache} from "../shared/redis/redis-cache";
import {RedisSubscriber} from "../shared/redis/redis-subscriber";

// Services
import {SettingService} from "../modules/system/services/setting.service";
import {RouteGuardService} from "../modules/system/services/route-guard.service";
import {UserService} from "../modules/users/services/user.service";
import {AuthService} from "../modules/auth/services/auth.service";
import {TokenService} from "../modules/auth/services/auth-token.service";
import {TwoFactorAuthenticationService} from "../modules/auth/services/two-factor-authentication.service";

// Event Handlers
import {SystemEventHandler} from "../modules/system/events/system.event";
import {SendGridMailService} from "../infrastructure/mail/sendgrid-mail.service";
import {PasswordRecoveryRepository} from "../modules/auth/repositories/password-recovery.repository";
import {PasswordRecoveryService} from "../modules/auth/services/password-recovery.service";
import {UserRepository} from "../modules/users/user.repository";

const securityUtil = new SecurityUtil({
    bcryptSecret: __ENV.BCRYPT_SECRET,
    bcryptSaltRounds: Number(__ENV.BCRYPT_SALT_ROUND || 10),
    cryptoSecret: __ENV.CRYPT0_SECRET,
    cryptoCipher: __ENV.CRYPT0_CIPHER,
});

export const redisCache = new RedisCache(
    DBRedis,
    securityUtil,
    logger,
);

export const redisSubscriber = new RedisSubscriber(
    DBRedis,
    logger,
);

// Repositories
const settingRepository = new SettingRepository(DBKnex);
const routeGuardRepository = new RouteGuardRepository(DBKnex);

export const userService = new UserService();
export const authService = new AuthService(securityUtil);
export const tokenService = new TokenService();

// Mail provider
const mailService = new SendGridMailService(
    __ENV.SENDGRID_API_KEY,
);

// Application services
export const settingService = new SettingService(
    settingRepository,
    redisCache,
);

const passwordRecoveryRepository =
    new PasswordRecoveryRepository(DBKnex);

export const routeGuardService = new RouteGuardService(
    routeGuardRepository,
    redisCache,
);

export const twoFactorAuthenticationService = new TwoFactorAuthenticationService(
    securityUtil,
    new TwoFactorAuthenticationRepository(DBKnex),
    new AuthenticationTokenRepository(DBKnex),
    tokenService,
    DateUtil,
    settingService,
    mailService,
);

export const passwordRecoveryService =
    new PasswordRecoveryService(
        securityUtil,
        passwordRecoveryRepository,
        new UserRepository(DBKnex),
        settingService,
        mailService,
    );

export const systemEventHandler = new SystemEventHandler(
    redisCache,
    settingService,
    routeGuardService,
);