import helmet from 'helmet';
import express, { Router } from 'express';
import { Server as HttpServer } from 'http';
import { SystemLoggerService } from 'src/services/system-logger.service';
import { LoggerService } from 'src/services/logger.service';
import { ErrorHandlerMiddleware } from 'src/middlewares/error-handler.middleware';

export class Server {
    private readonly app = express();
    private server: HttpServer | undefined;

    constructor(
        private readonly port: number,
        private readonly routes: Router,
        private readonly loggerService: LoggerService,
    ) {
        this.app.use(express.json({ limit: '10kb' }));
        this.app.use(express.urlencoded({ extended: true }));
        this.app.use(helmet());
        this.app.use(this.routes);
        this.app.use(new ErrorHandlerMiddleware(loggerService).middleware());
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
