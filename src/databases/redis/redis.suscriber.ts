import { ConfigService } from '@root/services/config.service';
import Redis from 'ioredis';
import { getRedisOptions } from './redis.options';

export class RedisSuscriber {
    constructor(
        private readonly configService: ConfigService,
        private readonly redisInstance: Redis
    ) {
        const subscriber = new Redis(getRedisOptions(configService));
        const expiredKeyPattern = '__keyevent@0__:expired';

        subscriber.subscribe(expiredKeyPattern, (err, count) => {
            if (err) {
                console.error('Failed to subscribe: ', err);
            } else {
                console.log(`Subscribed to ${expiredKeyPattern}`);
            }
        });

        subscriber.on('message', async (channel, expiredKey) => {
            console.log('Expired key:', expiredKey);

            // message in log

            // // Example: if key is `refresh:12345:jti-abc`
            // const refreshKeyRegex = /^refresh:(?<userId>[^:]+):(?<jti>.+)$/;
            // const match = expiredKey.match(refreshKeyRegex);
            // if (match?.groups) {
            //     const { userId, jti } = match.groups;
            //     await this.redisInstance.decr(makeSessionIndexKey(userId));
            //     console.log(`Cleaned up expired token jti=${jti} for user ${userId}`);
            // }
        });
    }
}

