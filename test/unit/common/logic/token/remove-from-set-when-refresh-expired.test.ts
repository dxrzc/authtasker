import Redis from 'ioredis';
import { makeRefreshTokenKey } from 'src/common/logic/token/make-refresh-token-key';
import { makeRefreshTokenIndexKey } from 'src/common/logic/token/make-refresh-token-index-key';
import { removeFromSetWhenRefreshTokenExpires } from 'src/common/logic/token/remove-from-set-when-refresh-expired';

describe('removeFromSetWhenRefreshTokenExpires', () => {
    test('logic works with current refresh-token-key', async () => {
        const userId = 'test-id';
        const jti = 'test-jti';
        // the splitting of userId and jti should success inside the function
        const expiredKey = makeRefreshTokenKey(userId, jti);
        const redis = { srem: jest.fn() };
        await removeFromSetWhenRefreshTokenExpires(expiredKey, redis as unknown as Redis);
        expect(redis.srem).toHaveBeenCalledWith(makeRefreshTokenIndexKey(userId), jti);
    });
});
