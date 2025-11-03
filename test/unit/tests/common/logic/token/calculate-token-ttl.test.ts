import { calculateTokenTTL } from 'src/common/logic/token/calculate-token-ttl';

describe('calculateTokenTTL', () => {
    test.concurrent(
        'return the number of seconds of the remaining token time to live',
        async () => {
            jest.spyOn(Date, 'now').mockReturnValue(Date.now());
            const tokenTTLInSeconds = 3600;
            const nowInSeconds = Math.floor(Date.now() / 1000);
            const tokenExpiresAtUnixSeconds = nowInSeconds + tokenTTLInSeconds;
            const finalttl = calculateTokenTTL(tokenExpiresAtUnixSeconds);
            expect(finalttl).toBe(tokenTTLInSeconds);
        },
    );
});
