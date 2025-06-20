import { shutdown } from './server/shutdown';
import { Server } from "./server/server.init";
import { AsyncLocalStorage } from "async_hooks";
import { AppRoutes } from './routes/server.routes';
import { RedisService } from './services/redis.service';
import { LoggerService } from '@root/services/logger.service';
import { ConfigService } from '@root/services/config.service';
import { MongoDatabase } from "./databases/mongo/mongo.database";
import { RedisDatabase } from './databases/redis/redis.database';
import { IShutdownParams } from './interfaces/server/shutdown.interface';
import { ErrorHandlerMiddleware } from './middlewares/error-handler.middleware';
import { IAsyncLocalStorageStore } from './interfaces/common/async-local-storage.interface';
import { SystemLoggerService } from './services/system-logger.service';

let server: Server | null = null;
let mongoDb: MongoDatabase | null = null;
let redisDb: RedisDatabase | null = null;

const shutdownParams: IShutdownParams = {
    server,
    mongoDb,
    redisDb,
    isShuttingDown: false,
    reason: ''
};

process.on('SIGINT', () => {
    shutdownParams.reason = 'SIGINT';
    shutdown(shutdownParams);
});

process.on('SIGTERM', () => {
    shutdownParams.reason = 'SIGTERM';
    shutdown(shutdownParams);
});

process.on('unhandledRejection', (reason: string) => {
    shutdownParams.reason = reason;
    shutdown(shutdownParams);
});

process.on('uncaughtException', (err) => {
    shutdownParams.reason = `${err}`;
    shutdown(shutdownParams);
});

async function main() {
    try {
        const configService = new ConfigService();
        SystemLoggerService.info(`Starting application in ${configService.NODE_ENV} MODE`);

        const asyncLocalStorage = new AsyncLocalStorage<IAsyncLocalStorageStore>();
        const loggerService = new LoggerService(configService, asyncLocalStorage);

        mongoDb = new MongoDatabase(configService, loggerService);
        await mongoDb.connect();
        shutdownParams.mongoDb = mongoDb;

        redisDb = new RedisDatabase(configService);
        const redisInstance = await redisDb.connect();
        const redisService = new RedisService(redisInstance);
        shutdownParams.redisDb = redisDb;

        server = new Server(
            configService.PORT,
            await new AppRoutes(
                configService,
                loggerService,
                asyncLocalStorage,
                redisService
            ).buildApp(),
            new ErrorHandlerMiddleware(loggerService)
        );
        await server.start();
        shutdownParams.server = server;

    } catch (error: any) {
        SystemLoggerService.error(`Startup failure: ${error}`, 'this is my stack trace');
        process.exit(1);
    }
}

main();