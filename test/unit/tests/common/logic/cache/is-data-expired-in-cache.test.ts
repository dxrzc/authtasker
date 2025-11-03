import { isDataInCacheExpired } from 'src/common/logic/cache/is-data-expired-in-cache';

describe('isDataInCacheExpired', () => {
    describe('current time is greater than the cachedAt time plus the ttls', () => {
        test('return true (expired)', async () => {
            // resource was cached 10000 seconds ago
            const cachedAtUnix = Math.floor(Date.now() / 1000) - 10000;
            const ttls = 120;
            const expired = isDataInCacheExpired(cachedAtUnix, ttls);
            expect(expired).toBeTruthy();
        });
    });

    describe('current time is less than the cachedAt time plus the ttls', () => {
        test('return false (not expired)', async () => {
            // resource expires in 300 seconds
            const cachedAtUnix = Math.floor(Date.now() / 1000);
            const ttls = 3000;
            const expired = isDataInCacheExpired(cachedAtUnix, ttls);
            expect(expired).toBeFalsy();
        });
    });
});