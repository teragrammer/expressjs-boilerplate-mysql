// src/app.ts
import express, {NextFunction, Request, Response,} from "express";

import v1 from "./routes/v1";
import {logger} from "./config/logger";
import {__ENV} from "./config/environment";
import errors from "./common/utils/messages";

import requestHandler from "./common/middleware/request.middleware";
import responseHandler from "./common/middleware/response.middleware";
import {errorHandler} from "./common/middleware/error.middleware";

import {configureMiddleware} from "./config/http";
import {bootstrap} from "./bootstrap";

const app = express();

configureMiddleware(app);

app.use(errorHandler);
app.use(requestHandler);
app.use(responseHandler);

app.use("/api/v1", v1());

app.use((_req: Request, res: Response) => {
    res.status(404).json({
        code: errors.DATA_NOT_FOUND.code,
        message: errors.DATA_NOT_FOUND.message,
    });
});

app.use(
    (
        err: unknown,
        _req: Request,
        res: Response,
        _next: NextFunction,
    ) => {
        const message =
            err instanceof Error
                ? err.message
                : String(err);

        logger.error(
            `${errors.SERVER_ERROR.message}, ${message}`,
        );

        const status =
            typeof err === "object" &&
            err !== null &&
            "status" in err &&
            typeof err.status === "number"
                ? err.status
                : 500;

        res.status(status).json({
            code: errors.SERVER_ERROR.code,
            message:
                __ENV.NODE_ENV === "production"
                    ? errors.SERVER_ERROR.message
                    : message,
        });
    },
);

export {bootstrap};

export default app;
