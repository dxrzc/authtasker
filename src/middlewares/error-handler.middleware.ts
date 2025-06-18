import { NextFunction, Request, Response } from "express";
import { LoggerService } from '@root/services/logger.service';
import { HttpError } from '@root/common/errors/classes/http-error.class';
import { SystemLoggerService } from '@root/services/system-logger.service';
import { statusCodes } from '@root/common/constants/status-codes.constants';
import { commonErrors } from '@root/common/errors/messages/common.error.messages';
import { InvalidInputError } from '@root/common/errors/classes/invalid-input-error.class';

export class ErrorHandlerMiddleware {

    constructor(private readonly loggerService: LoggerService) {}

    middleware() {
        return (err: Error, req: Request, res: Response, next: NextFunction) => {
            if (err instanceof HttpError) {
                res.status(err.statusCode).json({ error: err.message });
                return;
            };
            if (err instanceof InvalidInputError) {
                const errorMessage = err.message;
                this.loggerService.error(`Validation error: ${errorMessage}`);
                res.status(statusCodes.BAD_REQUEST).json({ error: errorMessage });
                return;
            };
            // internal
            this.loggerService.error(err.stack || err.message);
            SystemLoggerService.error(err.stack || err.message);
            res.status(500).json({ error: commonErrors.INTERNAL_SERVER_ERROR });
        }
    }
}