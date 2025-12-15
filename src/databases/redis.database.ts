import Redis from 'ioredis';
import { SystemLoggerService } from 'src/services/system-logger.service';

type RedisDbOptions = {
    redisUri: string;
    listenToConnectionEvents: boolean;
};

export class RedisDatabase {
    private readonly _client: Redis;
    private subscriber: Redis;

    constructor(private readonly opts: RedisDbOptions) {
        this._client = new Redis(this.opts.redisUri, {
            db: 0,
            lazyConnect: true,
            retryStrategy: (times) => Math.min(times * 50, 2000),
        });
        this.subscriber = new Redis(this.opts.redisUri, {
            db: 0,
            lazyConnect: true,
        });

        if (this.opts.listenToConnectionEvents) {
            this.setupRedisEventListener();
        }
    }

    get client() {
        return this._client;
    }

    async subscribe(event: string, listener: (key: string, client: Redis) => Promise<void>) {
        this.subscriber.on('message', (channel, expiredKey) => {
            try {
                void listener(expiredKey, this._client);
            } catch (err) {
                SystemLoggerService.error(`Redis subscriber listener failed: ${err as string}`);
            }
        });
        await this.subscriber.subscribe(event, (err) => {
            if (err) throw new Error(`Failed to subscribe: ${err}`);
            SystemLoggerService.info(`Suscribed to redis event: ${event}`);
        });
    }

    private setupRedisEventListener() {
        this._client.on('ready', () => {
            SystemLoggerService.info('Redis connected successfully');
        });

        this._client.on('error', (error) => {
            SystemLoggerService.error('Redis connection error:', error.message);
        });

        this._client.on('close', () => {
            SystemLoggerService.warn('Redis connection closed');
        });

        this._client.on('end', () => {
            SystemLoggerService.warn('Redis connection ended');
        });
    }

    async connect(): Promise<Redis> {
        if (!['reconnecting', 'connecting', 'connect', 'ready'].includes(this._client.status)) {
            await this._client.connect();
        }
        if (!['reconnecting', 'connecting', 'connect', 'ready'].includes(this.subscriber.status)) {
            await this.subscriber.connect();
        }
        return this._client;
    }

    async disconnect(): Promise<void> {
        if (this._client.status === 'ready') {
            await this._client.quit();
        }
        if (this.subscriber.status === 'ready') {
            await this.subscriber.quit();
        }
    }
}
