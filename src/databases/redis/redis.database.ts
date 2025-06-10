import Redis from 'ioredis';
import { ConfigService, SystemLoggerService } from '@root/services';
import { EventManager } from '@root/events/eventManager';

// TODO:
// The RedisDatabase emits the signal "fatalServiceConnectionError"
// when the connection can not be reestablished after a disconnection.
// Do note this service connection will not be re-opened after
// the max reconnection attemps unless the "serviceConnectionResumed" signal
// is emmited from another part of the application.

export class RedisDatabase {
    private redis: Redis;
    private firstConnectionSuccess = false;

    constructor(private readonly configService: ConfigService) {
        const maxRetries = 5;
        let connectionAttempt = 0;
        this.redis = new Redis({
            lazyConnect: true,
            port: configService.REDIS_PORT,
            host: configService.REDIS_HOST,
            password: configService.REDIS_PASSWORD,
            db: 0,
            retryStrategy: (times) => {
                if (times >= 5) {
                    return null;
                }

                connectionAttempt = times;
                const delay = Math.min(times * 1000, 50000);
                SystemLoggerService.warn(`Retrying Redis connection (attempt ${times} of ${maxRetries}) in ${delay}ms...`);
                return delay;
            }
        });

        if (configService.NODE_ENV === 'development' || configService.NODE_ENV === 'e2e')
            this.listenConnectionEvents();
    }

    listenConnectionEvents(): void {
        this.redis.on('connect', () => {
            if (!this.firstConnectionSuccess) {
                SystemLoggerService.info(`Redis service connected`);
                this.firstConnectionSuccess = true;
            } else {
                SystemLoggerService.info(`Redis service reconnected`);
            }
        });

        // connection fully closed and will not reconnect
        this.redis.on('end', () => {
            SystemLoggerService.error(`Redis service disconnected`);
            EventManager.emit('fatalServiceConnectionError');
        });

        this.redis.on('error', (err) => {
            // connection errors are already handled
            if (!err.message.includes('ECONNREFUSED')) {
                SystemLoggerService.error(`Redis connection error: ${err.message}`);
            }
        });
    }

    async connect(): Promise<Redis> {
        if (!['reconnecting', 'connecting', 'connect', 'ready'].includes(this.redis.status)) {            
            await this.redis.connect();
        }
        return this.redis;
    }

    async disconnect(): Promise<void> {
        if (this.redis.status === 'ready')
            await this.redis.quit();
    }
}