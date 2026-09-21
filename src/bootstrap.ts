// src/bootstrap.ts
import {logger} from "./config/logger";
import {redisSubscriber, routeGuardService, settingService, systemEventHandler,} from "./config/container";

import {SettingService} from "./modules/system/settings/setting.service";
import {RouteGuardService} from "./modules/system/route-guards/route-guard.service";

export async function bootstrap(): Promise<void> {
    logger.info("Initializing system modules...");

    // Warm system caches in parallel.
    await Promise.all([
        settingService.boot(),
        routeGuardService.boot(),
    ]);

    logger.info(
        "System settings and route guards successfully cached.",
    );

    await initializeRedisSubscriptions();
}

async function initializeRedisSubscriptions(): Promise<void> {
    if (!redisSubscriber.isConnected()) {
        logger.warn(
            "Redis is offline or disconnected. Running in fallback database-only mode.",
        );

        return;
    }

    await redisSubscriber.subscribe(
        SettingService.CACHE_KEY,
        async (channel: string) => {
            await systemEventHandler.handleCacheUpdate(channel);
        },
    );

    await redisSubscriber.subscribe(
        RouteGuardService.CACHE_KEY,
        async (channel: string) => {
            await systemEventHandler.handleCacheUpdate(channel);
        },
    );

    logger.info(
        "System module subscriptions and listeners initialized.",
    );
}
