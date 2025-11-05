import Redis from 'ioredis';
import { removeFromSetWhenRefreshTokenExpires } from 'src/functions/token/remove-from-set-when-refresh-expired';
import { ConfigService } from 'src/services/config.service';
import { SystemLoggerService } from 'src/services/system-logger.service';

export class RedisDatabase {
    private readonly client: Redis;
    private subscriber: Redis;

    constructor(private readonly configService: ConfigService) {
        this.client = new Redis(configService.REDIS_URI, {
            db: 0,
            lazyConnect: true,
            retryStrategy: (times) => Math.min(times * 50, 2000),
        });

        // Create subscriber for expired key events
        this.subscriber = new Redis(this.configService.REDIS_URI, {
            db: 0,
            lazyConnect: true,
            retryStrategy: (times) => Math.min(times * 50, 2000),
        });
        const expiredKeyPattern = '__keyevent@0__:expired';
        this.subscriber.on('message', (channel, expiredKey) => {
            void removeFromSetWhenRefreshTokenExpires(expiredKey, this.client);
        });
        void this.subscriber.subscribe(expiredKeyPattern, (err) => {
            if (err) throw new Error(`Failed to subscribe: ${err}`);
            SystemLoggerService.info(`Suscribed to redis event: ${expiredKeyPattern}`);
        });

        this.setupRedisEventListener();
    }

    private setupRedisEventListener() {
        this.client.on('ready', () => {
            SystemLoggerService.info('Redis connected successfully');
        });

        this.client.on('error', (error) => {
            SystemLoggerService.error('Redis connection error:', error.message);
        });
    }

    async connect(): Promise<Redis> {
        if (!['reconnecting', 'connecting', 'connect', 'ready'].includes(this.client.status))
            await this.client.connect();
        return this.client;
    }

    async disconnect(): Promise<void> {
        if (this.client.status === 'ready') await this.client.quit();
    }
}
