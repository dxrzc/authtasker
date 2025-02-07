import express, { Router } from "express";
import { Server as HttpServer } from "http";
import timeout from "connect-timeout";
import { SystemLoggerService } from "@root/services/system-logger.service";
import helmet from "helmet";

export class Server {

    private readonly app = express();
    private server: HttpServer | undefined;

    constructor(
        private readonly port: number,
        private readonly routes: Router
    ) {
        this.app.use(express.json());
        this.app.use(express.json({ limit: '10kb' }));
        this.app.use(helmet());        
        this.app.use(timeout('5s'));
        this.app.use(this.routes);
    }

    start(): Promise<void> {
        return new Promise<void>((resolve) => {
            this.server = this.app.listen(this.port, () => {
                SystemLoggerService.info(`Server listening on port ${this.port}`)
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