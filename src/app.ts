// src/app.ts
import express, {Request, Response,} from "express";

import v1 from "./routes/v1";
import errors from "./common/utils/messages";

import requestHandler from "./common/middleware/request.middleware";
import responseHandler from "./common/middleware/response.middleware";
import {errorHandler} from "./common/middleware/error.middleware";

import {configureMiddleware} from "./config/http";
import {bootstrap} from "./bootstrap";

const app = express();

configureMiddleware(app);

app.use(requestHandler);
app.use(responseHandler);

app.use("/api/v1", v1());

app.use((_req: Request, res: Response) => {
    res.status(404).json({
        code: errors.DATA_NOT_FOUND.code,
        message: errors.DATA_NOT_FOUND.message,
    });
});

app.use(errorHandler);

export {bootstrap};

export default app;
