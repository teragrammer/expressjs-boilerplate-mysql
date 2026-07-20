// src/config/container.ts

import {DBKnex} from "./knex";
import {DBRedis} from "./redis";
import {logger} from "./logger";
import {__ENV} from "./environment";
import {SecurityUtil} from "../common/utils/security.util";
import {SettingRepository} from "../modules/system/repositories/setting.repository";
import {RouteGuardRepository} from "../modules/system/repositories/route-guard.repository";
import {RedisCache} from "../shared/redis/redis-cache";
import {RedisSubscriber} from "../shared/redis/redis-subscriber";
import {SettingService} from "../modules/system/services/setting.service";
import {RouteGuardService} from "../modules/system/services/route-guard.service";
import {SystemEventHandler} from "../modules/system/events/system.event";

// Structural Layer Setup
const settingRepository = new SettingRepository(DBKnex);
const routeGuardRepository = new RouteGuardRepository(DBKnex);

const securityUtil = new SecurityUtil({
    bcryptSecret: __ENV.BCRYPT_SECRET,
    bcryptSaltRounds: Number(__ENV.BCRYPT_SALT_ROUND || 10),
    cryptoSecret: __ENV.CRYPT0_SECRET,
    cryptoCipher: __ENV.CRYPT0_CIPHER
});

export const redisCache = new RedisCache(DBRedis, securityUtil, logger);
export const redisSubscriber = new RedisSubscriber(DBRedis, logger);

// Concrete Services Instantiation
// (No longer trapped inside app.ts!)
export const settingService = new SettingService(settingRepository, redisCache);
export const routeGuardService = new RouteGuardService(routeGuardRepository, redisCache);

// Event Handler Instantiation
export const systemEventHandler = new SystemEventHandler(
    redisCache,
    settingService,
    routeGuardService
);