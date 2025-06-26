import Redis from 'ioredis';
import { getRedisOptions } from './redis.options';
import { ConfigService } from '@root/services/config.service';
import { SystemLoggerService } from '@root/services/system-logger.service';
import { removeFromSetWhenRefreshTokenExpires } from '@logic/token/remove-from-set-when-refresh-expired';

export class RedisSuscriber {
    constructor(
        private readonly configService: ConfigService,
        private readonly redisInstance: Redis
    ) {
        const subscriber = new Redis(getRedisOptions(this.configService));
        const expiredKeyPattern = '__keyevent@0__:expired';

        subscriber.subscribe(expiredKeyPattern, (err, count) => {
            if (err) throw new Error(`Failed to subscribe: ${err}`);
            SystemLoggerService.info(`Suscribed to redis event: ${expiredKeyPattern}`);
        });

        subscriber.on(
            'message',
            async (channel, expiredKey) => removeFromSetWhenRefreshTokenExpires(expiredKey, this.redisInstance)
        );
    }
}

