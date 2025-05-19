import { JwtBlackListService, JwtService, RedisService } from "@root/services";

describe('JwtBlacklist', () => {
    let redisService: RedisService;
    let jwtBlacklistService: JwtBlackListService;
    let jwtService: JwtService;

    beforeAll(() => {
        redisService = new RedisService(global.CONFIG_SERVICE);
        jwtBlacklistService = new JwtBlackListService(redisService);
        jwtService = new JwtService(global.CONFIG_SERVICE.JWT_PRIVATE_KEY);
    });

    afterAll(async () => {
        await redisService.disconnect();
    });

    describe('Token is blacklisted', () => {
        test('isBlacklisted should return true', async () => {
            // generate and valid a token
            const token = jwtService.generate('3m', { id: '12345' });
            const payload = jwtService.verify(token);
            const tokenID = payload!.jti;
            const tokenExp = payload!.exp!;

            // calculate the remaining token ttl
            const currentTime = Math.floor(Date.now() / 1000);
            const remainingTokenTTL = tokenExp - currentTime;

            await jwtBlacklistService.blacklist(tokenID, remainingTokenTTL);

            const tokenIsBlacklisted = await jwtBlacklistService.isBlacklisted(tokenID);
            expect(tokenIsBlacklisted).toBeTruthy();
        });
    });

    describe('Token is not blacklisted', () => {
        test('isBlacklisted should return false', async () => {
            // generate and valid a token
            const token = jwtService.generate('3m', { id: '12345' });
            const payload = jwtService.verify(token);
            const tokenID = payload!.jti;

            const tokenIsBlacklisted = await jwtBlacklistService.isBlacklisted(tokenID);
            expect(tokenIsBlacklisted).toBeFalsy();
        });
    });

    describe('Token is blacklisted', () => {
        test('redis should remove token when ttl is completed', (done) => {
            // generate 10s ttl token                     
            const token = jwtService.generate('10s', { id: '12345' });
            const payload = jwtService.verify(token);
            const tokenID = payload!.jti;
            const tokenExp = payload!.exp!;

            // calculate the remaining token ttl
            const currentTime = Math.floor(Date.now() / 1000);
            const remainingTokenTTL = tokenExp - currentTime;

            jwtBlacklistService.blacklist(tokenID, remainingTokenTTL)
                .then(() => {
                    // wait 11s, token should be automatically removed from redis
                    setTimeout(async () => {
                        const tokenInRedis = await redisService.get<string>(tokenID);
                        expect(tokenInRedis).toBeNull();
                        done();
                    }, 11000);
                });

        }, 13000);
    });
});