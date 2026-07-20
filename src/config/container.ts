// src/config/container.ts

import {DBKnex} from "./knex";
import {DBRedis} from "./redis";
import {logger} from "./logger";
import {__ENV} from "./environment";
import {SecurityUtil} from "../common/utils/security.util";

// Repositories
import {SettingRepository} from "../modules/system/repositories/setting.repository";
import {RouteGuardRepository} from "../modules/system/repositories/route-guard.repository";

// Shared Cache Elements
import {RedisCache} from "../shared/redis/redis-cache";
import {RedisSubscriber} from "../shared/redis/redis-subscriber";

// Services
import {SettingService} from "../modules/system/services/setting.service";
import {RouteGuardService} from "../modules/system/services/route-guard.service";
import {UserService} from "../modules/users/user.service";
import {AuthService} from "../modules/auth/services/auth.service";
import {TokenService} from "../modules/auth/services/auth-token.service";

// Event Handlers
import {SystemEventHandler} from "../modules/system/events/system.event";

// Shared Utilities & Infrastructure Wire-up
const securityUtil = new SecurityUtil({
    bcryptSecret: __ENV.BCRYPT_SECRET,
    bcryptSaltRounds: Number(__ENV.BCRYPT_SALT_ROUND || 10),
    cryptoSecret: __ENV.CRYPT0_SECRET,
    cryptoCipher: __ENV.CRYPT0_CIPHER
});

export const redisCache = new RedisCache(DBRedis, securityUtil, logger);
export const redisSubscriber = new RedisSubscriber(DBRedis, logger);

// Concrete Repositories Setup
const settingRepository = new SettingRepository(DBKnex);
const routeGuardRepository = new RouteGuardRepository(DBKnex);

// Concrete Services Instantiation (The Singletons)
export const settingService = new SettingService(settingRepository, redisCache);
export const routeGuardService = new RouteGuardService(routeGuardRepository, redisCache);

// Authentications Subdomain singletons added directly to your existing core container
export const userService = new UserService();
export const authService = new AuthService(securityUtil);
export const tokenService = new TokenService();

// Global Event Handlers Setup
export const systemEventHandler = new SystemEventHandler(
    redisCache,
    settingService,
    routeGuardService
);