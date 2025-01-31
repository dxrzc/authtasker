import { Response } from "express";
import { HTTP_STATUS_CODE } from "@root/rules/constants/http-status-codes.constants";
import { HttpError } from "@root/rules/errors/http.error";
import { LoggerService } from "@root/services/logger.service";
import { SystemLoggerService } from "@root/services/system-logger.service";

export const handleError = (res: Response, error: Error | unknown, logger: LoggerService) => {
    if (error instanceof HttpError) {
        res.status(error.statusCode).json({ error: error.message });
        // its assumed that error logging was handled in the service function that threw it
        return;
    }

    if (error instanceof Error) {
        res.status(HTTP_STATUS_CODE.INTERNALSERVER).json({ error: 'Unexpected error' });
        logger.error(`UNEXPECTED ERROR: ${error.message}`, error.stack);
        logger.debug(`UNEXPECTED ERROR: ${error.stack}`);
        SystemLoggerService.error(error.message);
        return;
    }

    // unknown error
    logger.error(`UNKNOWN ERROR: ${error}`);
    SystemLoggerService.error(error as string);
    return res.status(HTTP_STATUS_CODE.INTERNALSERVER).json({ error: 'Unknown error' });
};
