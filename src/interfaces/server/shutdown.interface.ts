import { Server } from '@root/server/server.init';
import { MongoDatabase } from '@root/databases/mongo/mongo.database';
import { RedisDatabase } from '@root/databases/redis/redis.database';

export interface IShutdownParams {
    server: Server | null,
    mongoDb: MongoDatabase | null,
    redisDb: RedisDatabase | null,
    isShuttingDown: boolean,
    reason: string
}