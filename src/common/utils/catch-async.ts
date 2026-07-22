// src/common/utils/catch-async.ts

import {NextFunction, Request, RequestHandler, Response} from "express";

type AsyncRequestHandler = (req: Request, res: Response, next: NextFunction) => Promise<any>;

const catchAsync = (fn: AsyncRequestHandler): RequestHandler => {
    return (req, res, next) => {
        fn(req, res, next).catch(next);
    };
};

export default catchAsync;