import Redis from 'ioredis';
import { getRedisOptions } from './redis.options';
import { ConfigService } from '@root/services/config.service';
import { SystemLoggerService } from '@root/services/system-logger.service';
import { makeRefreshTokenCountKey } from '@logic/token/make-refresh-token-count-key';

export class RedisSuscriber {
    constructor(
        private readonly configService: ConfigService,
        private readonly redisInstance: Redis
    ) {
        const subscriber = new Redis(getRedisOptions(configService));
        const expiredKeyPattern = '__keyevent@0__:expired';

        subscriber.subscribe(expiredKeyPattern, (err, count) => {
            if (err)
                SystemLoggerService.error(`Failed to subscribe: ${err}`);
            else
                SystemLoggerService.info(`Suscribed to redis event: ${expiredKeyPattern}`);
        });

        subscriber.on('message', async (channel, expiredKey) => {
            if (expiredKey.startsWith('jwt:refresh')) {
                const userId = expiredKey.split(':').at(2);
                if (!userId)
                    throw new Error('Can not get the user id from the expired key');
                await this.redisInstance.decr(makeRefreshTokenCountKey(userId));
            }
        });
    }
}

