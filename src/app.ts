// src/app.ts

import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import hpp from "hpp";
import compression from "compression";
import { express as useragent } from "express-useragent";

import v1 from "./routes/v1";
import { logger } from "./config/logger";
import { __ENV } from "./config/environment";
import errors from "./common/utils/messages";

import requestHandler from "./common/middleware/request.middleware";
import responseHandler from "./common/middleware/response.middleware";
import { errorHandler } from "./common/middleware/error.middleware";

// Service & Event classes (for public static references like CACHE_KEY)
import { SettingService } from "./modules/system/services/setting.service";
import { RouteGuardService } from "./modules/system/services/route-guard.service";

// Import Singleton DI instances from the dedicated container
import {
    settingService,
    routeGuardService,
    redisSubscriber,
    systemEventHandler
} from "./config/container";

const app = express();

// ---------------------------------------------------------
// Global Middleware Stack Setup
// ---------------------------------------------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(helmet());
app.use(hpp());
app.disable("x-powered-by");
app.use(useragent());
app.use(cors());

if (__ENV.HAS_PROXY) app.set("trust proxy", true);

app.use(
    compression({
        filter: (req: Request, res: Response) => {
            if (req.headers["x-no-compression"]) return false;
            return compression.filter(req, res);
        },
    })
);

app.use((req: Request, _res: Response, next: NextFunction) => {
    logger.info(`${req.method} ${req.url}`);
    next();
});

// Register standard custom middleware handlers
app.use(errorHandler);
app.use(requestHandler);
app.use(responseHandler);

// ---------------------------------------------------------
// Main Application Routing
// ---------------------------------------------------------
app.use("/api/v1", v1());

// Handle 404 - Not Found
app.use((_req: Request, res: Response) => {
    res.status(404).json({
        code: errors.DATA_NOT_FOUND.code,
        message: errors.DATA_NOT_FOUND.message,
    });
});

// Express global internal server error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    logger.error(`${errors.SERVER_ERROR.message}, ${err.message}`);

    res.status(err.status || 500).json({
        code: errors.SERVER_ERROR.code,
        message: __ENV.NODE_ENV === "production" ? errors.SERVER_ERROR.message : err.message,
    });
});

// ---------------------------------------------------------
// Secure Async Bootstrapping & Cache Warming
// ---------------------------------------------------------
export async function bootstrap(): Promise<void> {
    try {
        logger.info("Initializing system modules...");

        // Warm database-to-cache in parallel using the container instances
        await Promise.all([
            settingService.boot(),
            routeGuardService.boot()
        ]);
        logger.info("System settings and route guards successfully cached.");

        // Safe setup of Redis Pub/Sub cluster triggers using the Subscriber instance
        if (redisSubscriber.isConnected()) {

            // Subscribe to settings change event and trigger local memory eviction
            await redisSubscriber.subscribe(SettingService.CACHE_KEY, async (channel: string) => {
                await systemEventHandler.handleCacheUpdate(channel);
            });

            // Subscribe to guard change event and trigger local memory eviction
            await redisSubscriber.subscribe(RouteGuardService.CACHE_KEY, async (channel: string) => {
                await systemEventHandler.handleCacheUpdate(channel);
            });

            logger.info("System module subscriptions and listeners initialized.");
        } else {
            logger.warn("Redis is offline or disconnected. Running in fallback database-only mode.");
        }

    } catch (error: any) {
        logger.error(`Critical bootstrap failure: ${error.message}`);
        process.exit(1);
    }
}

export default app;