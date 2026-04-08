import { NextFunction, Request, Response } from 'express';
import { isValidObjectId } from 'mongoose';
import { HttpError } from 'src/errors/http-error.class';
import { IIdValidationMiddlewareOptions } from 'src/interfaces/middlewares/id-validation.middleware.interface';
import { LoggerService } from 'src/services/logger.service';

export class ValidateIdMiddleware {
    constructor(private readonly loggerService: LoggerService) {}

    middleware(opts: IIdValidationMiddlewareOptions) {
        return (req: Request, res: Response, next: NextFunction) => {
            const id = req[opts.requestLocation][opts.propertyName];
            if (!id && opts.optional) return next();
            if (!isValidObjectId(id)) {
                this.loggerService.error(`Invalid mongo id`);
                throw HttpError.notFound(opts.errorMessage);
            }
            next();
        };
    }
}
