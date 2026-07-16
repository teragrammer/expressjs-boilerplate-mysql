// src/config/redis.legacy.ts

import {__ENV} from "./environment";
import Redis from "ioredis";
import fs from "fs";
import {logger} from "./logger";

let redisLegacy: Redis | undefined;
let redisSubClient: Redis | undefined;

if (__ENV.REDIS_HOST == "") {
    redisLegacy = undefined;
    redisSubClient = undefined;
} else {
    const CONFIG: any = {
        host: __ENV.REDIS_HOST,
        port: __ENV.REDIS_PORT,
        password: __ENV.REDIS_PASS,
    };

    // set SSL connection support
    if (__ENV.REDIS_TLS) {
        CONFIG.tls = {
            ca: fs.readFileSync(__ENV.REDIS_TLS_CA).toString(),
            cert: fs.readFileSync(__ENV.REDIS_TLS_CERT).toString(),
            key: fs.readFileSync(__ENV.REDIS_TLS_KEY).toString(),
            // Optional for self-signed certs:
            rejectUnauthorized: false,
        };
    }

    redisLegacy = new Redis(CONFIG);
    redisSubClient = redisLegacy.duplicate();

    redisLegacy.on("connect", () => {
        logger.info("🤝 Connected to Redis over TLS ✅");
    });

    redisLegacy.on("ready", () => {
        logger.info("Redis ready for commands");
    });

    redisLegacy.on("error", (err: any) => {
        logger.info(`Redis connection error ❌, ${err.message}`);
    });

    redisLegacy.on("close", () => {
        logger.info("Redis connection closed");
    });

    redisLegacy.ping().then(() => logger.info("Redis received PONG")).catch(() => logger.error("Regis PING failed"));
}

export interface DBRedisInterface {
    publisher?: Redis;
    subscriber?: Redis;
}

export const DBRedis: DBRedisInterface = {
    publisher: redisLegacy,
    subscriber: redisSubClient,
};