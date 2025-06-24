import Redis from 'ioredis';
import { EventManager } from '@root/events/eventManager';
import { ConfigService } from '@root/services/config.service';
import { Events } from '@root/common/constants/events.constants';
import { SystemLoggerService } from '@root/services/system-logger.service';
import { getRedisOptions } from './redis.options';

export class RedisDatabase {

    private disconnectedManually = false;
    private redis: Redis;

    constructor(private readonly configService: ConfigService) {
        this.redis = new Redis(getRedisOptions(configService));
        this.connectionEvents();
    }

    connectionEvents() {
        this.redis.on('end', () => {
            if (!this.disconnectedManually) {
                EventManager.emit(Events.REDIS_CONNECTION_ERROR);
            }
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
            this.disconnectedManually = true;
            SystemLoggerService.warn('Disconnected from Redis database');
        }
    }
}