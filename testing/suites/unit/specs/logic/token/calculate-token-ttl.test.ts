import { calculateTokenTTL } from 'src/functions/token/calculate-token-ttl';

describe('calculateTokenTTL', () => {
    test('return the number of seconds of the remaining token time to live', () => {
        jest.spyOn(Date, 'now').mockReturnValue(Date.now());
        const tokenTTLInSeconds = 3600;
        const nowInSeconds = Math.floor(Date.now() / 1000);
        const tokenExpiresAtUnixSeconds = nowInSeconds + tokenTTLInSeconds;
        const finalttl = calculateTokenTTL(tokenExpiresAtUnixSeconds);
        expect(finalttl).toBe(tokenTTLInSeconds);
    });
});
