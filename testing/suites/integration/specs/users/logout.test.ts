import { faker } from '@faker-js/faker/.';
import { testKit } from '@integration/kit/test.kit';
import { createUser } from '@integration/utils/create-user.util';
import { status2xx } from '@integration/utils/status-2xx.util';
import { stringValueToSeconds } from '@integration/utils/string-value-to-seconds.util';
import { getRandomRole } from '@test/tools/utilities/get-random-role.util';
import { rateLimiting } from 'src/constants/rate-limiting.constants';
import { statusCodes } from 'src/constants/status-codes.constants';
import { RateLimiter } from 'src/enums/rate-limiter.enum';
import { UserRole } from 'src/enums/user-role.enum';
import { makeRefreshTokenIndexKey } from 'src/functions/token/make-refresh-token-index-key';
import { makeRefreshTokenKey } from 'src/functions/token/make-refresh-token-key';
import { makeSessionTokenBlacklistKey } from 'src/functions/token/make-session-token-blacklist-key';
import { authErrors } from 'src/messages/auth.error.messages';
import { commonErrors } from 'src/messages/common.error.messages';

describe(`POST ${testKit.urls.logout}`, () => {
    describe('Session token not provided', () => {
        test(`return 401 status code and invalid token error message`, async () => {
            const response = await testKit.agent.post(testKit.urls.logout);
            expect(response.body).toStrictEqual({ error: authErrors.INVALID_TOKEN });
            expect(response.statusCode).toBe(401);
        });
    });

    describe('Refresh token not provided', () => {
        test(`return 400 status code and refresh token not provided in body error message`, async () => {
            const error = authErrors.REFRESH_TOKEN_NOT_PROVIDED_IN_BODY;
            const { sessionToken } = await createUser(getRandomRole());
            const response = await testKit.agent
                .post(testKit.urls.logout)
                .set('Authorization', `Bearer ${sessionToken}`)
                .send({});
            expect(response.body).toStrictEqual({ error });
            expect(response.statusCode).toBe(400);
        });
    });

    describe('Successful logout', () => {
        test('session token is blacklisted for the remaining ttl in redis', async () => {
            const { sessionToken, refreshToken } = await createUser(UserRole.EDITOR);
            await testKit.agent
                .post(testKit.urls.logout)
                .set('Authorization', `Bearer ${sessionToken}`)
                .send({ refreshToken })
                .expect(status2xx);
            const sessionJti = testKit.sessionJwt.verify(sessionToken)!.jti;
            const redisKey = makeSessionTokenBlacklistKey(sessionJti);
            const tokenInRedis = await testKit.redisService.get(redisKey);
            const ttlSeconds = await testKit.redisService.getTtl(redisKey);
            const expectedTtlSeconds = stringValueToSeconds(
                testKit.configService.JWT_SESSION_EXP_TIME,
            );
            expect(tokenInRedis).toBe(1);
            expect(ttlSeconds).toBeGreaterThanOrEqual(expectedTtlSeconds - 2);
            expect(ttlSeconds).toBeLessThanOrEqual(expectedTtlSeconds);
        });

        test('refresh token is deleted from Redis', async () => {
            const { sessionToken, refreshToken, id } = await createUser(getRandomRole());
            await testKit.agent
                .post(testKit.urls.logout)
                .set('Authorization', `Bearer ${sessionToken}`)
                .send({ refreshToken })
                .expect(status2xx);
            const { jti } = testKit.refreshJwt.verify(refreshToken)!;
            const redisKey = makeRefreshTokenKey(id, jti);
            const inRedis = await testKit.redisService.get(redisKey);
            expect(inRedis).toBeNull();
        });

        test('refresh token is deleted from refresh tokens index in Redis', async () => {
            const { refreshToken, id, sessionToken } = await createUser(getRandomRole());
            await testKit.agent
                .post(testKit.urls.logout)
                .set('Authorization', `Bearer ${sessionToken}`)
                .send({ refreshToken })
                .expect(status2xx);
            const { jti } = testKit.refreshJwt.verify(refreshToken)!;
            const redisKey = makeRefreshTokenIndexKey(id);
            const inRedis = await testKit.redisService.belongsToList(redisKey, jti);
            expect(inRedis).toBeFalsy();
        });

        test('return 204 status code and no body', async () => {
            const { sessionToken, refreshToken } = await createUser(getRandomRole());
            const res = await testKit.agent
                .post(testKit.urls.logout)
                .set('Authorization', `Bearer ${sessionToken}`)
                .send({ refreshToken })
                .expect(204);
            expect(res.body).toStrictEqual({});
        });
    });

    describe('Too many requests', () => {
        test(`return 429 status code and too many requests error message`, async () => {
            const ip = faker.internet.ip();
            const { sessionToken } = await createUser(getRandomRole());
            for (let i = 0; i < rateLimiting[RateLimiter.critical].max; i++) {
                await testKit.agent
                    .post(testKit.urls.logout)
                    .set('Authorization', `Bearer ${sessionToken}`)
                    .set('X-Forwarded-For', ip)
                    .send({});
            }
            const response = await testKit.agent
                .post(testKit.urls.logout)
                .set('Authorization', `Bearer ${sessionToken}`)
                .send({})
                .set('X-Forwarded-For', ip);
            expect(response.body).toStrictEqual({ error: commonErrors.TOO_MANY_REQUESTS });
            expect(response.statusCode).toBe(statusCodes.TOO_MANY_REQUESTS);
        });
    });
});
