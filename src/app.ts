import express, {NextFunction, Request, Response} from "express";
import cors from "cors";
import helmet from "helmet";
import hpp from "hpp";
import compression from "compression";
import {express as useragent} from "express-useragent";

import v1 from "./http/routes/v1";
import {logger} from "./configurations/logger";
import {__ENV} from "./configurations/environment";
import errors from "./configurations/errors";

import {SET_CACHE_SETTINGS} from "./models/setting.model";
import {SET_CACHE_GUARDS} from "./models/route-guard.model";

import REQUEST_MIDDLEWARE from "./http/middlewares/request.middleware";
import RESPONSE_MIDDLEWARE from "./http/middlewares/response.middleware";

import SettingService from "./services/setting.service";
import RouteGuardService from "./services/route-guard.service";
import RedisSubscriberService from "./services/redis-subscriber.service";
import RedisEventService from "./services/redis-event.service";

const app = express();

// Middleware to parse JSON and URL-encoded bodies
app.use(express.json());
app.use(express.urlencoded({extended: true}));

// Basic security middleware
app.use(helmet());
app.use(hpp());
app.disable("x-powered-by");
app.use(useragent());
app.use(cors());

// Enable trust proxy to get correct IP when behind a proxy
if (__ENV.HAS_PROXY) app.set("trust proxy", true);

// Compress responses
app.use(
    compression({
        filter: function (req: Request, res: Response) {
            if (req.headers["x-no-compression"]) return false;
            return compression.filter(req, res);
        },
    })
);

// Logging middleware
app.use((req: Request, _res: Response, next: NextFunction) => {
    logger.info(`${req.method} ${req.url}`);
    next();
});

// Custom middlewares
app.use(REQUEST_MIDDLEWARE);
app.use(RESPONSE_MIDDLEWARE);

// Cache application settings and route guards
SettingService.boot().then(() => logger.info("Setting Cached"));
RouteGuardService.boot().then(() => logger.info("Route Guard Cached"));

// Subscribe to redis events
RedisSubscriberService.subscribe(SET_CACHE_SETTINGS);
RedisSubscriberService.subscribe(SET_CACHE_GUARDS);

// Received redis events
RedisEventService.onReceived();

// Routes with versioning
app.use("/api/v1", v1());

// Handle 404 - Not Found
app.use((_req: Request, res: Response) => {
    res.status(404).json({
        code: errors.DATA_NOT_FOUND.code,
        message: errors.DATA_NOT_FOUND.message,
    });
});

// Error handling middleware
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    logger.error(`${errors.SERVER_ERROR.message}, ${err.message}`);

    res.status(err.status || 500).json({
        code: errors.SERVER_ERROR.code,
        message: __ENV.NODE_ENV === "production" ? errors.SERVER_ERROR.message : err.message,
    });
});

export default app;