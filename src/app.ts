import { AsyncLocalStorage } from 'async_hooks';
import { ConfigService } from 'src/services/config.service';
import { LoggerService } from 'src/services/logger.service';
import { Events } from './constants/events.constants';
import { MongoDatabase } from './databases/mongo/mongo.database';
import { RedisDatabase } from './databases/redis/redis.database';
import { RedisSuscriber } from './databases/redis/redis.suscriber';
import { EventManager } from './events/eventManager';
import { IAsyncLocalStorageStore } from './interfaces/common/async-local-storage.interface';
import { createErrorHandlerMiddleware } from './middlewares/error-handler.middleware';
import { AppRoutes } from './routes/server.routes';
import { Server } from './server/server.init';
import { ShutdownManager } from './server/shutdown';
import { RedisService } from './services/redis.service';
import { SystemLoggerService } from './services/system-logger.service';

// process.on('SIGINT', () => {
//     void ShutdownManager.shutdown({
//         cause: 'SIGINT',
//         exitCode: 0,
//     });
// });

// process.on('SIGTERM', () => {
//     void ShutdownManager.shutdown({
//         cause: 'SIGTERM',
//         exitCode: 0,
//     });
// });

process.on('unhandledRejection', (reason: any) => {
    void ShutdownManager.shutdown({
        cause: `unhandledRejection: ${reason}`,
        exitCode: 1,
        stack: reason.stack,
    });
});

process.on('uncaughtException', (err) => {
    void ShutdownManager.shutdown({
        cause: `uncaughtException: ${err.message}`,
        exitCode: 1,
        stack: err.stack,
    });
});

EventManager.listen(Events.MONGO_CONNECTION_ERROR, () => {
    void ShutdownManager.shutdown({
        cause: 'Mongo database connection lost',
        exitCode: 1,
    });
});

EventManager.listen(Events.REDIS_CONNECTION_ERROR, () => {
    void ShutdownManager.shutdown({
        cause: 'Redis database connection lost',
        exitCode: 1,
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
    new RedisSuscriber(configService, redisInstance);
    ShutdownManager.redisDb = redisDb;

    // server
    const server = new Server(
        configService.PORT,
        await new AppRoutes(
            configService,
            loggerService,
            asyncLocalStorage,
            redisService,
        ).buildApp(),
        createErrorHandlerMiddleware(loggerService),
    );
    await server.start();
    ShutdownManager.server = server;
}

void main();
