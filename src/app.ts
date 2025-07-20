import { Server } from "./server/server.init";
import { AsyncLocalStorage } from "async_hooks";
import { AppRoutes } from './routes/server.routes';
import { ShutdownManager } from './server/shutdown';
import { RedisService } from './services/redis.service';
import { LoggerService } from '@root/services/logger.service';
import { ConfigService } from '@root/services/config.service';
import { MongoDatabase } from "./databases/mongo/mongo.database";
import { RedisDatabase } from './databases/redis/redis.database';
import { SystemLoggerService } from './services/system-logger.service';
import { ErrorHandlerMiddleware } from './middlewares/error-handler.middleware';
import { IAsyncLocalStorageStore } from './interfaces/common/async-local-storage.interface';
import { EventManager } from './events/eventManager';
import { Events } from './common/constants/events.constants';
import { RedisSuscriber } from './databases/redis/redis.suscriber';

process.on('SIGINT', async () => {
    await ShutdownManager.shutdown({
        cause: 'SIGINT',
        exitCode: 0
    });
});

process.on('SIGTERM', async () => {
    await ShutdownManager.shutdown({
        cause: 'SIGTERM',
        exitCode: 0
    });
});

process.on('unhandledRejection', async (reason: any) => {
    await ShutdownManager.shutdown({
        cause: `unhandledRejection: ${reason}`,
        exitCode: 1,
        stack: reason.stack
    });
});

process.on('uncaughtException', async (err) => {
    await ShutdownManager.shutdown({
        cause: `uncaughtException: ${err.message}`,
        exitCode: 1,
        stack: err.stack
    });
});

EventManager.listen(Events.MONGO_CONNECTION_ERROR, async () => {
    await ShutdownManager.shutdown({
        cause: 'Mongo database connection lost',
        exitCode: 1
    });
});

EventManager.listen(Events.REDIS_CONNECTION_ERROR, async () => {
    await ShutdownManager.shutdown({
        cause: 'Redis database connection lost',
        exitCode: 1
    });
});

async function main() {
    // envs
    const configService = new ConfigService();
    SystemLoggerService.info(`Starting application in ${configService.NODE_ENV} mode`);

    // http-logger
    const asyncLocalStorage = new AsyncLocalStorage<IAsyncLocalStorageStore>();
    const loggerService = new LoggerService(configService, asyncLocalStorage);

    // mongo
    const mongoDb = new MongoDatabase(configService, loggerService);
    await mongoDb.connect();
    ShutdownManager.mongoDb = mongoDb;

    // redis
    const redisDb = new RedisDatabase(configService);
    const redisInstance = await redisDb.connect();
    const redisService = new RedisService(redisInstance);
    const redisSuscriber = new RedisSuscriber(configService, redisInstance);
    ShutdownManager.redisDb = redisDb;

    // server
    const server = new Server(
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
    ShutdownManager.server = server;
}

main();