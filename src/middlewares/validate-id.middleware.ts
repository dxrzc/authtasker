import { NextFunction, Request, Response } from 'express';
import { isValidObjectId } from 'mongoose';
import { HttpError } from 'src/errors/http-error.class';
import { usersApiErrors } from 'src/messages/users-api.error.messages';
import { LoggerService } from 'src/services/logger.service';

export class ValidateIdMiddleware {
    constructor(private readonly loggerService: LoggerService) {}

    middleware(paramName = 'id') {
        return (req: Request, res: Response, next: NextFunction) => {
            const id = req.params[paramName];
            if (!isValidObjectId(id)) {
                this.loggerService.error(`Invalid mongo id`);
                throw HttpError.notFound(usersApiErrors.NOT_FOUND);
            }
            next();
        };
    }
}
