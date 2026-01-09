import { invalidateExpiredRefreshToken } from 'src/functions/token/remove-refresh-token-from-list';
import { makeRefreshTokenIndexKey } from 'src/functions/token/make-refresh-token-index-key';

describe('invalidateExpiredRefreshToken', () => {
    test('removes jti from refresh index when key expires', async () => {
        const redis = { lrem: jest.fn().mockResolvedValue(1) } as any;
        const key = 'jwt:refresh:user123:token456';
        await invalidateExpiredRefreshToken(key, redis);
        expect(redis.lrem).toHaveBeenCalledWith(makeRefreshTokenIndexKey('user123'), 0, 'token456');
    });

    test('ignores non-refresh keys', async () => {
        const redis = { lrem: jest.fn() } as any;
        await invalidateExpiredRefreshToken('some-other-key', redis);
        expect(redis.lrem).not.toHaveBeenCalled();
    });

    test('throws when userId and jti is missing and data cannot be parsed', async () => {
        const redis = { lrem: jest.fn() } as any;
        await expect(invalidateExpiredRefreshToken('jwt:refresh', redis)).rejects.toThrow();
    });

    test('throws when jti is missing and data cannot be parsed', async () => {
        const redis = { lrem: jest.fn() } as any;
        await expect(invalidateExpiredRefreshToken('jwt:refresh:userId', redis)).rejects.toThrow();
    });
});
