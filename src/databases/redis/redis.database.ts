import Redis from 'ioredis';
import { getRedisOptions } from './redis.options';
import { EventManager } from '@root/events/eventManager';
import { ConfigService } from '@root/services/config.service';
import { Events } from '@root/common/constants/events.constants';
import { SystemLoggerService } from '@root/services/system-logger.service';

export class RedisDatabase {

    private disconnectedManually = false;
    private redis: Redis;

    constructor(private readonly configService: ConfigService) {
        this.redis = new Redis(configService.REDIS_URI, getRedisOptions());
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
        await this.redis.config('SET', 'notify-keyspace-events', 'Ex');        
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