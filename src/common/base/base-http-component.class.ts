import { Request, Response, NextFunction, RequestHandler } from 'express';

export class BaseHttpComponent {
    protected forwardError(fn: RequestHandler): RequestHandler {
        return function (req: Request, res: Response, next: NextFunction) {
            try {
                const maybePromise = fn(req, res, next);
                if (maybePromise && typeof maybePromise.then === 'function') {
                    maybePromise.catch(next);
                }
            } catch (err) {
                next(err);
            }
        }
    }
}