import { Server } from "./server/server.init";
import { AsyncLocalStorage } from "async_hooks";
import { AppRoutes } from './routes/server.routes';
import { RedisService } from './services/redis.service';
import { LoggerService } from '@root/services/logger.service';
import { ConfigService } from '@root/services/config.service';
import { ApplicationEvents } from "./events/application.events";
import { MongoDatabase } from "./databases/mongo/mongo.database";
import { RedisDatabase } from './databases/redis/redis.database';
import { SystemLoggerService } from './services/system-logger.service';
import { ErrorHandlerMiddleware } from './middlewares/error-handler.middleware';
import { IAsyncLocalStorageStore } from './interfaces/common/async-local-storage.interface';

async function main() {
    process.on('unhandledRejection', (reason, promise) => {
        SystemLoggerService.error(`Unhandled rejection: ${reason}`);
    });

    const configService = new ConfigService();
    SystemLoggerService.info(`Starting application in ${configService.NODE_ENV} MODE`);

    const asyncLocalStorage = new AsyncLocalStorage<IAsyncLocalStorageStore>();
    const loggerService = new LoggerService(configService, asyncLocalStorage);

    // mongo connection
    const mongoDatabase = new MongoDatabase(
        configService,
        loggerService
    );
    await mongoDatabase.connect();

    // redis connection
    const redisDatabase = new RedisDatabase(configService);
    const redisInstance = await redisDatabase.connect();
    const redisService = new RedisService(redisInstance);

    // server connection
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
    server.start();

    // function called in case mongodb reconnects after a disconnection
    ApplicationEvents.resumeApplication(async () => {
        await server.start();
        await redisDatabase.connect();
    });

    // function called in case redis or mongo connection fails
    ApplicationEvents.closeApplication(async () => {
        await server.close();
    });
}

main();