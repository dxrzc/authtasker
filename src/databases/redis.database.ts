import Redis from 'ioredis';
import { SystemLoggerService } from 'src/services/system-logger.service';

type RedisDbOptions = {
    redisUri: string;
    listenConnectionEvents: boolean;
};

export class RedisDatabase {
    private readonly client: Redis;
    private subscriber: Redis;

    constructor(private readonly opts: RedisDbOptions) {
        this.client = new Redis(this.opts.redisUri, {
            db: 0,
            lazyConnect: true,
            retryStrategy: (times) => Math.min(times * 50, 2000),
        });
        this.subscriber = new Redis(this.opts.redisUri, {
            db: 0,
            lazyConnect: true,
        });

        if (this.opts.listenConnectionEvents) {
            this.setupRedisEventListener();
        }
    }

    async subscribe(event: string, listener: (key: string, client: Redis) => void) {
        this.subscriber.on('message', (channel, expiredKey) => {
            listener(expiredKey, this.client);
        });
        await this.subscriber.subscribe(event, (err) => {
            if (err) throw new Error(`Failed to subscribe: ${err}`);
            SystemLoggerService.info(`Suscribed to redis event: ${event}`);
        });
    }

    private setupRedisEventListener() {
        this.client.on('ready', () => {
            SystemLoggerService.info('Redis connected successfully');
        });

        this.client.on('error', (error) => {
            SystemLoggerService.error('Redis connection error:', error.message);
        });

        this.client.on('close', () => {
            SystemLoggerService.warn('Redis connection closed');
        });

        this.client.on('end', () => {
            SystemLoggerService.warn('Redis connection ended');
        });
    }

    async connect(): Promise<Redis> {
        if (!['reconnecting', 'connecting', 'connect', 'ready'].includes(this.client.status)) {
            await this.client.connect();
            // await this.subscriber.connect();
        }
        return this.client;
    }

    async disconnect(): Promise<void> {
        const disconnectPromises: Promise<string>[] = [];

        if (this.client.status === 'ready') {
            disconnectPromises.push(this.client.quit());
        }

        if (this.subscriber && this.subscriber.status === 'ready') {
            disconnectPromises.push(this.subscriber.quit());
        }

        await Promise.all(disconnectPromises);
    }
}
