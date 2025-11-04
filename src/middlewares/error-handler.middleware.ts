import { Request, Response } from 'express';
import { LoggerService } from 'src/services/logger.service';
import { HttpError } from 'src/errors/http-error.class';
import { SystemLoggerService } from 'src/services/system-logger.service';
import { statusCodes } from 'src/constants/status-codes.constants';
import { commonErrors } from 'src/messages/common.error.messages';
import { InvalidInputError } from 'src/errors/invalid-input-error.class';

export class ErrorHandlerMiddleware {
    constructor(private readonly loggerService: LoggerService) {}

    middleware() {
        return (err: Error, req: Request, res: Response) => {
            if (err instanceof HttpError) {
                res.status(err.statusCode).json({ error: err.message });
                return;
            }
            if (err instanceof InvalidInputError) {
                const errorMessage = err.message;
                this.loggerService.error(`Validation error: ${errorMessage}`);
                res.status(statusCodes.BAD_REQUEST).json({ error: errorMessage });
                return;
            }
            // internal
            this.loggerService.error(err.message);
            SystemLoggerService.error(err.message, err.stack);
            res.status(500).json({ error: commonErrors.INTERNAL_SERVER_ERROR });
        };
    }
}
