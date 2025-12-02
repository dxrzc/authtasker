import Redis from 'ioredis';
import { makeRefreshTokenKey } from 'src/functions/token/make-refresh-token-key';
import { makeRefreshTokenIndexKey } from 'src/functions/token/make-refresh-token-index-key';
import { removeFromListWhenRefreshTokenExpires } from 'src/functions/token/remove-from-list-when-refresh-token-expires';

describe('removeFromSetWhenRefreshTokenExpires', () => {
    test('logic works with current refresh-token-key', async () => {
        const userId = 'test-id';
        const jti = 'test-jti';
        // the splitting of userId and jti should success inside the function
        const expiredKey = makeRefreshTokenKey(userId, jti);
        const redis = { lrem: jest.fn() };
        await removeFromListWhenRefreshTokenExpires(expiredKey, redis as unknown as Redis);
        expect(redis.lrem).toHaveBeenCalledWith(makeRefreshTokenIndexKey(userId), 0, jti);
    });
});
