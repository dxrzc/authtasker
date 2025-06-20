import Redis from 'ioredis';
import { ConfigService } from '@root/services/config.service';
import { SystemLoggerService } from '@root/services/system-logger.service';

export class RedisDatabase {
    private redis: Redis;

    constructor(private readonly configService: ConfigService) {
        this.redis = new Redis({
            lazyConnect: true,
            port: configService.REDIS_PORT,
            host: configService.REDIS_HOST,
            password: configService.REDIS_PASSWORD,
            db: 0,
        });
    }

    async connect(): Promise<Redis> {
        if (!['reconnecting', 'connecting', 'connect', 'ready'].includes(this.redis.status)) {
            await this.redis.connect();
            SystemLoggerService.info('Connected to Redis database');
        }
        return this.redis;
    }

    async disconnect(): Promise<void> {
        if (this.redis.status === 'ready') {
            await this.redis.quit();
            SystemLoggerService.warn('Disconnected from Redis database');
        }
    }
}