import { IShutdownParams } from '@root/interfaces/server/shutdown.interface';
import { SystemLoggerService } from '@root/services/system-logger.service';

export async function shutdown(params: IShutdownParams): Promise<void> {
    try {
        if (params.isShuttingDown) return;
        params.isShuttingDown = true;        

        SystemLoggerService.error(`Shutting down due to ${params.reason}`);
        if (params.server) await params.server.close();
        if (params.mongoDb) await params.mongoDb.disconnect();
        if (params.redisDb) await params.redisDb.disconnect()
        process.exit(0);

    } catch (error) {
        SystemLoggerService.error(`Error during shutdown: ${error}`);
        process.exit(1);
    }
}