import winston from 'winston';

export class SystemLoggerService {
    private static logger: winston.Logger;

    static {
        const devLogsFilename = 'logs/dev/system.logs.log';
        const prodLogsFilename = 'logs/prod/system.logs.log';

        SystemLoggerService.logger = winston.createLogger({
            transports: [
                new winston.transports.Console({
                    format: winston.format.combine(
                        winston.format.timestamp(),
                        winston.format.printf(({ level, message, timestamp, stackTrace }) => {
                            const colorizer = winston.format.colorize().colorize;

                            const coloredLevel = colorizer(level, `[${level.toUpperCase()}]`);
                            const coloredTimestamp = colorizer(level, `[${timestamp}]`);
                            const finalMessage = message as any;

                            const coloredMessage = colorizer(level, finalMessage);

                            if (stackTrace)
                                return `${coloredTimestamp} ${coloredLevel}: ${coloredMessage} ${stackTrace}`;

                            return `${coloredTimestamp} ${coloredLevel}: ${coloredMessage}`;
                        }),
                    ),
                }),
                // add timestamp in file
                new winston.transports.File({
                    filename:
                        process.env.NODE_ENV === 'production' ? prodLogsFilename : devLogsFilename,
                    format: winston.format.combine(
                        winston.format.timestamp(),
                        winston.format.prettyPrint(),
                    ),
                }),
            ],
        });
    }

    static info(message: string) {
        SystemLoggerService.logger.info(message);
    }

    static error(message: string, stackTrace?: string) {
        try {
            SystemLoggerService.logger.log({
                level: 'error',
                message,
                stackTrace,
            });
        } catch (error) {
            console.error(error);
        }
    }

    static warn(message: string) {
        SystemLoggerService.logger.warn(message);
    }
}
