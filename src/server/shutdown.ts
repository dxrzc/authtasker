import { Server } from './server.init';
import { MongoDatabase } from 'src/databases/mongo.database';
import { RedisDatabase } from 'src/databases/redis.database';
import { SystemLoggerService } from 'src/services/system-logger.service';
import { IShutdownParams } from 'src/interfaces/server/shutdown.interface';

export class ShutdownManager {
    static isShuttingDown = false;
    static server?: Server;
    static mongoDb?: MongoDatabase;
    static redisDb?: RedisDatabase;

    static async shutdown(params: IShutdownParams): Promise<void> {
        try {
            if (ShutdownManager.isShuttingDown) return;
            ShutdownManager.isShuttingDown = true;

            const logMessage = `Shutting down due to ${params.cause}`;
            if (params.exitCode === 1) SystemLoggerService.error(logMessage, params.stack);
            else SystemLoggerService.warn(logMessage);

            if (this.server) await this.server.close();
            if (this.mongoDb) await this.mongoDb.disconnect();
            if (this.redisDb) await this.redisDb.disconnect();

            process.exitCode = params.exitCode;
        } catch (error: any) {
            SystemLoggerService.error(`Error during shutdown: ${error}`, error.stack);
            process.exitCode = 1;
        }
    }
}
