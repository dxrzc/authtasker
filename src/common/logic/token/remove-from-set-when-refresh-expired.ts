import Redis from 'ioredis';
import { makeRefreshTokenIndexKey } from './make-refresh-token-index-key';

export async function removeFromSetWhenRefreshTokenExpires(expiredKey: string, redis: Redis) {
    const userId = expiredKey.split(':').at(2);
    const jti = expiredKey.split(':').at(-1);

    if (!userId || !jti)
        throw new Error('Redis suscriber: Failed to obtain data from expired key');

    // delete expired token from user refresh tokens set
    await redis.srem(makeRefreshTokenIndexKey(userId), jti);
}