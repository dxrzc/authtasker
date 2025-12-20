import Redis from 'ioredis';
import { makeRefreshTokenIndexKey } from './make-refresh-token-index-key';

export async function invalidateExpiredRefreshToken(
    expiredKey: string,
    redis: Redis,
): Promise<void> {
    if (!expiredKey.startsWith('jwt:refresh')) return;
    const [, , userId, jti] = expiredKey.split(':');

    if (!userId || !jti) throw new Error('Redis suscriber: Failed to obtain data from expired key');

    // delete expired token from user refresh tokens list
    await redis.lrem(makeRefreshTokenIndexKey(userId), 0, jti);
}
