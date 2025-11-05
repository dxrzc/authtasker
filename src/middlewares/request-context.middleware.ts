import { v4 as uuidv4 } from 'uuid';
import { AsyncLocalStorage } from 'async_hooks';
import { LoggerService } from 'src/services/logger.service';
import { NextFunction, Request, RequestHandler, Response } from 'express';

export class RequestContextMiddleware {
    constructor(
        private readonly asyncLocalStorage: AsyncLocalStorage<unknown>,
        private readonly loggerService: LoggerService,
    ) {}

    public middleware(): RequestHandler {
        return (req: Request, res: Response, next: NextFunction) => {
            if (req.body == null) {
                req.body = {}; // Normalize undefined → {}
            }

            const url = req.originalUrl;
            const method = req.method;
            const requestId = uuidv4();

            const store = {
                requestId,
                method,
            };

            const start = process.hrtime();

            res.on('finish', () => {
                if (!req.route && res.statusCode === 404) {
                    return;
                }

                const [seconds, nanoseconds] = process.hrtime(start);
                const durationInMs = seconds * 1000 + nanoseconds / 1000000;

                this.loggerService.logRequest({
                    ip: req.ip!,
                    method: req.method,
                    requestId: requestId,
                    responseTime: durationInMs,
                    statusCode: res.statusCode,
                    url,
                });
            });

            res.setHeader('Request-Id', requestId);

            this.asyncLocalStorage.run(store, () => {
                if (req.route) this.loggerService.info(`Incoming request ${url}`);
                next();
            });
        };
    }
}
