import { LoggerService, SystemLoggerService } from "@root/services"
import { NextFunction, Request, Response } from "express"

export const errorHandlerMiddlewareFactory = (loggerService: LoggerService) => {
    return (err: Error, req: Request, res: Response, next: NextFunction) => {
        res.status(500).json({ error: 'Internal server error' });
        loggerService.error(err.stack || err.message);
        SystemLoggerService.error(err.stack || err.message);
    }
}