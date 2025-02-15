import winston from "winston";
import { AsyncLocalStorage } from "async_hooks";
import { ConfigService } from "./config.service";
import { IAsyncLocalStorageStore } from "@root/interfaces/common/async-local-storage.interface";
import { IRequestFsLog } from "@root/interfaces";

/*  
    WINSTON LEVELS
    error: number;
    warn: number;
    info: number;
    http: number;
    verbose: number;
    debug: number;
    silly: number 
*/

export class LoggerService {

    private consoleLogger: winston.Logger;
    private requestCompletedFileLogger: winston.Logger
    private httpMessageFileLogger: winston.Logger;

    constructor(
        private readonly configService: ConfigService,
        private readonly asyncLocalStorage: AsyncLocalStorage<IAsyncLocalStorageStore>
    ) {
        const currentEnv = this.configService.NODE_ENV;

        const consoleTransport = new winston.transports.Console({
            // no debug messages in production mode
            level: currentEnv === 'production' ? 'info' : 'debug',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.printf(({ level, message, timestamp, method, requestId }) => {
                    const colorizer = winston.format.colorize().colorize;

                    const finalMessage = (() => {
                        let mssg = (message as string).toLowerCase();
                        return mssg[0].toUpperCase() + mssg.slice(1);
                    })();

                    const coloredTimestamp = colorizer(level, `[${timestamp}]`);
                    const coloredMethod = colorizer(level, `[${method}]`);
                    const coloredRequest = colorizer(level, `[${requestId}]`);
                    const coloredLevel = colorizer(level, `[${(level as string).toUpperCase()}]`);
                    const coloredMessage = colorizer(level, finalMessage);

                    return `${coloredTimestamp} ${coloredRequest} ${coloredMethod} ${coloredLevel}: ${finalMessage}`;
                }),
            ),
        });

        this.consoleLogger = winston.createLogger({
            transports: [consoleTransport]
        });

        const devLogsFolder = 'logs/dev';
        const prodLogsFolder = 'logs/prod';

        const folder = currentEnv === 'production' ?
            prodLogsFolder : devLogsFolder;

        this.httpMessageFileLogger = winston.createLogger({
            transports: [new winston.transports.File({
                // no debug messages in fs
                level: 'info',
                filename: `${folder}/http-messages.log`,
                // add timestamp in filesystem logs
                format: winston.format.combine(
                    winston.format.timestamp(),
                    winston.format.json(),
                )
            })]
        });

        this.requestCompletedFileLogger = winston.createLogger({
            transports: [new winston.transports.File({
                // no debug messages in fs
                level: 'info',
                filename: `${folder}/request-completed.log`,
                // add timestamp in filesystem logs
                // level is not saved
                format: winston.format.combine(
                    winston.format.timestamp(),
                    winston.format.printf(({ level, timestamp, message, ...meta }) => {
                        return JSON.stringify({ timestamp, message, ...meta });
                    })
                ),
            })]
        });
    }

    private log(
        level: 'info' | 'error' | 'debug' | 'warn',
        message: string,
        stackTrace?: string
    ): void {
        if (this.configService.HTTP_LOGS) {
            const requestId = this.asyncLocalStorage.getStore()?.requestId || 'N/A';
            const method = this.asyncLocalStorage.getStore()?.method || 'Unknown Route';

            this.consoleLogger.log({
                level,
                message,
                method,
                requestId,
                stackTrace, // TODO:¿?
            });

            this.httpMessageFileLogger.log({
                level,
                message,
                requestId,
            });
        }
    }

    info(message: string) {
        this.log('info', message);
    }

    error(message: string, stackTrace?: string) {
        // stackTrace is not shown in console, 
        // use debug to print the stack
        this.log('error', message, stackTrace);
    }

    debug(message: string) {
        this.log('debug', message);
    }

    warn(message: string) {
        this.log('warn', message);
    }

    logRequest(data: IRequestFsLog) {
        if (this.configService.HTTP_LOGS) {
            this.requestCompletedFileLogger.info({
                message: `Request completed`,
                // timestamp added automatically, level not needed
                ...data
            });

            const { requestId, method } = data;

            this.consoleLogger.log({
                message: `Request completed (${data.responseTime}ms)`,
                level: 'info',
                requestId,
                method
            });
        };
    }
}