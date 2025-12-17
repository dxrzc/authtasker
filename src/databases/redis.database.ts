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
        const commonOpts = {
            retryStrategy: (times: number) => {
                // ms
                const baseDelay = 50;
                const maxDelay = 2000;
                // double the delay each time
                const incrementalDelay = baseDelay * Math.pow(2, times - 1);
                // never greater than maxDelay
                const finalDelay = Math.min(incrementalDelay, maxDelay);
                // jitter
                return Math.round(finalDelay / 2 + Math.random() * (finalDelay / 2));
            },
            // reconnection attempts allowed per queued command
            maxRetriesPerRequest: 5,
        } as const;
        this._client = new Redis(this.opts.redisUri, {
            db: 0,
            lazyConnect: true,
            ...commonOpts,
        });
        this.subscriber = new Redis(this.opts.redisUri, {
            db: 0,
            lazyConnect: true,
            // automatically resubscribe after reconnection
            autoResubscribe: true,
            ...commonOpts,
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
            SystemLoggerService.error('Redis client connection error:', error.message);
        });

        this.subscriber.on('error', (error) => {
            SystemLoggerService.error('Redis subscriber connection error:', error.message);
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
