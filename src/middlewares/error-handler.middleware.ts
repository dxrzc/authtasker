import { NextFunction, Request, Response } from "express";
import { LoggerService, SystemLoggerService } from "@root/services";
import { HttpError } from '@root/common/errors/classes/http-error.class';
import { commonErrors } from '@root/common/errors/messages';

export class ErrorHandlerMiddleware {

    constructor(private readonly loggerService: LoggerService) {}

    middleware() {
        return (err: Error, req: Request, res: Response, next: NextFunction) => {
            if (err instanceof HttpError) {
                res.status(err.statusCode).json({ error: err.message });
            } else {
                res.status(500).json({ error: commonErrors.INTERNAL_SERVER_ERROR });
                this.loggerService.error(err.stack || err.message);
                SystemLoggerService.error(err.stack || err.message);
            }
        }
    }
}