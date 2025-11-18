import express, { ErrorRequestHandler, NextFunction, Request, Response, Router } from 'express';
import helmet from 'helmet';
import { Server as HttpServer } from 'http';
import { statusCodes } from 'src/constants/status-codes.constants';
import { HttpError } from 'src/errors/http-error.class';
import { InvalidCredentialsInput, InvalidInputError } from 'src/errors/invalid-input-error.class';
import { authErrors } from 'src/messages/auth.error.messages';
import { commonErrors } from 'src/messages/common.error.messages';
import { LoggerService } from 'src/services/logger.service';
import { SystemLoggerService } from 'src/services/system-logger.service';

export class Server {
    private readonly app = express();
    private server: HttpServer | undefined;

    constructor(
        private readonly port: number,
        private readonly routes: Router,
        private readonly logger: LoggerService,
    ) {
        this.app.use(express.json({ limit: '10kb' }));
        this.app.use(express.urlencoded({ extended: true }));
        // Ensure req.body is always defined
        this.app.use((req, res, next) => {
            if (req.body === undefined) {
                req.body = {};
            }
            next();
        });
        this.app.use(helmet());
        this.app.use(this.routes);
        this.app.use(this.createErrorHandlerMiddleware);
    }

    private get createErrorHandlerMiddleware(): ErrorRequestHandler {
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
                if (err instanceof InvalidCredentialsInput) {
                    res.status(statusCodes.UNAUTHORIZED).json({
                        error: authErrors.INVALID_CREDENTIALS,
                    });
                } else {
                    res.status(statusCodes.BAD_REQUEST).json({ error: errorMessage });
                }
                return;
            }
            // Internal Server Error
            this.logger.error(err.message);
            SystemLoggerService.error(err.message, err.stack);
            res.status(500).json({ error: commonErrors.INTERNAL_SERVER_ERROR });
        };
    }

    start(): Promise<void> {
        return new Promise<void>((resolve) => {
            this.server = this.app.listen(this.port, () => {
                SystemLoggerService.info(`Server listening on port ${this.port}`);
                resolve();
            });
        });
    }

    close(): Promise<void> {
        return new Promise<void>((resolve) => {
            if (this.server && this.server.listening) {
                this.server.closeAllConnections();
                this.server.close(() => {
                    SystemLoggerService.warn('Server closed');
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }
}
