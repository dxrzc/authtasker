import { AsyncLocalStorage } from 'async_hooks';
import { ConfigService } from 'src/services/config.service';
import { LoggerService } from 'src/services/logger.service';
import { MongoDatabase } from './databases/mongo.database';
import { RedisDatabase } from './databases/redis.database';
import { AppRoutes } from './routes/app.routes';
import { Server } from './server/server.init';
import { ShutdownManager } from './server/shutdown';
import { RedisService } from './services/redis.service';
import { SystemLoggerService } from './services/system-logger.service';
import { IAsyncLocalStorageStore } from './interfaces/others/async-local-storage.interface';
import { invalidateExpiredRefreshToken } from './functions/token/remove-refresh-token-from-list';

// TODO:
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

async function main() {
    // envs
    const configService = new ConfigService();
    SystemLoggerService.info(`Starting application in ${configService.NODE_ENV} mode`);

    // http-logger
    const asyncLocalStorage = new AsyncLocalStorage<IAsyncLocalStorageStore>();
    const loggerService = new LoggerService(configService, asyncLocalStorage);

    // mongo
    const mongoDb = new MongoDatabase(loggerService, {
        listenConnectionEvents: true,
        listenModelEvents: configService.isDevelopment,
        mongoUri: configService.MONGO_URI,
    });
    await mongoDb.connect();
    ShutdownManager.mongoDb = mongoDb;

    // redis
    const redisDb = new RedisDatabase({
        listenToConnectionEvents: true,
        redisUri: configService.REDIS_URI,
    });
    const redisInstance = await redisDb.connect();
    await redisDb.subscribe('__keyevent@0__:expired', invalidateExpiredRefreshToken);
    const redisService = new RedisService(redisInstance);
    ShutdownManager.redisDb = redisDb;

    // server
    const appRoutes = new AppRoutes(
        configService,
        loggerService,
        asyncLocalStorage,
        redisService,
        redisDb.client,
    );
    await appRoutes.createInitialAdminUser();
    const server = new Server(configService.PORT, appRoutes.routes, loggerService);
    await server.start();
    ShutdownManager.server = server;
}

void main();
