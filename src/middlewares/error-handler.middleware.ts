import { ErrorRequestHandler, NextFunction, Request, Response } from 'express';
import { statusCodes } from 'src/constants/status-codes.constants';
import { HttpError } from 'src/errors/http-error.class';
import { InvalidInputError } from 'src/errors/invalid-input-error.class';
import { commonErrors } from 'src/messages/common.error.messages';
import { LoggerService } from 'src/services/logger.service';
import { SystemLoggerService } from 'src/services/system-logger.service';

export class ErrorHandlerMiddleware {
    constructor(private readonly logger: LoggerService) {}

    middleware(): ErrorRequestHandler {
        return (err: Error, req: Request, res: Response, next: NextFunction) => {
            if (res.headersSent) {
                // Response was already sent to client
                return next(err);
            }
            if (err instanceof HttpError) {
                // Logs were already made when throwing the error
                res.status(err.statusCode).json({ error: err.message });
                return;
            }
            if (err instanceof InvalidInputError) {
                // Validators don't log errors
                const errorMessage = err.message;
                this.logger.error(`Validation error: ${errorMessage}`);
                res.status(statusCodes.BAD_REQUEST).json({ error: errorMessage });
                return;
            }
            // Internal Server Error
            this.logger.error(err.message);
            SystemLoggerService.error(err.message, err.stack);
            res.status(500).json({ error: commonErrors.INTERNAL_SERVER_ERROR });
        };
    }
}
