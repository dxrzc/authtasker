import Redis from 'ioredis';
import { getRedisOptions } from './redis.options';
import { ConfigService } from 'src/services/config.service';
import { SystemLoggerService } from 'src/services/system-logger.service';
import { removeFromSetWhenRefreshTokenExpires } from 'src/common/logic/token/remove-from-set-when-refresh-expired';

export class RedisSuscriber {
    constructor(
        private readonly configService: ConfigService,
        private readonly redisInstance: Redis,
    ) {
        const subscriber = new Redis(this.configService.REDIS_URI, getRedisOptions());
        const expiredKeyPattern = '__keyevent@0__:expired';

        void subscriber.subscribe(expiredKeyPattern, (err) => {
            if (err) throw new Error(`Failed to subscribe: ${err}`);
            void SystemLoggerService.info(`Suscribed to redis event: ${expiredKeyPattern}`);
        });

        subscriber.on('message', (channel, expiredKey) => {
            void removeFromSetWhenRefreshTokenExpires(expiredKey, this.redisInstance);
        });
    }
}
