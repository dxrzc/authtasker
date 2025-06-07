import { NextFunction, Request, Response } from "express";
import { LoggerService, SystemLoggerService } from "@root/services";
import { HttpError } from '@root/rules/errors/http.error';

export class ErrorHandlerMiddleware {
    
    constructor(private readonly loggerService: LoggerService) {}

    middleware() {
        return (err: Error, req: Request, res: Response, next: NextFunction) => {
            if (err instanceof HttpError) {                
                res.status(err.statusCode).json({ error: err.message });
            } else {
                res.status(500).json({ error: 'Internal server error' });
                this.loggerService.error(err.stack || err.message);
                SystemLoggerService.error(err.stack || err.message);
            }
        }
    }
}