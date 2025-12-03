import { AsyncLocalStorage } from 'async_hooks';
import { NextFunction, Request, RequestHandler, Response } from 'express';
import { IAsyncLocalStorageStore } from 'src/interfaces/others/async-local-storage.interface';
import { LoggerService } from 'src/services/logger.service';
import { v4 as uuidv4 } from 'uuid';

export class RequestContextMiddleware {
    constructor(
        private readonly asyncLocalStrg: AsyncLocalStorage<IAsyncLocalStorageStore>,
        private readonly logger: LoggerService,
    ) {}

    middleware(): RequestHandler {
        return (req: Request, res: Response, next: NextFunction) => {
            const url = req.originalUrl;
            const method = req.method;
            const requestId = uuidv4();
            const start = process.hrtime();
            const store = {
                requestId,
                method,
            };

            res.on('finish', () => {
                // Do not log for non-existing routes
                if (!req.route) return;
                const [seconds, nanoseconds] = process.hrtime(start);
                const durationInMs = seconds * 1000 + nanoseconds / 1000000;
                this.logger.logRequest({
                    ip: req.ip!,
                    method: req.method,
                    requestId: requestId,
                    responseTime: durationInMs,
                    statusCode: res.statusCode,
                    url,
                });
            });

            this.asyncLocalStrg.run(store, () => {
                // Do not log or set reqId for non-existing routes
                if (req.route) {
                    res.setHeader('Request-Id', requestId);
                    this.logger.info(`Incoming request ${url}`);
                }
                next();
            });
        };
    }
}
