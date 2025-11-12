import { faker } from '@faker-js/faker/.';
import { testKit } from '@integration/kit/test.kit';
import { createUser } from '@integration/utils/create-user.util';
import { status2xx } from '@integration/utils/status-2xx.util';
import { getRandomRole } from '@test/tools/utilities/get-random-role.util';
import { rateLimiting } from 'src/constants/rate-limiting.constants';
import { statusCodes } from 'src/constants/status-codes.constants';
import { JwtTypes } from 'src/enums/jwt-types.enum';
import { RateLimiter } from 'src/enums/rate-limiter.enum';
import { UserRole } from 'src/enums/user-role.enum';
import { makeRefreshTokenIndexKey } from 'src/functions/token/make-refresh-token-index-key';
import { makeRefreshTokenKey } from 'src/functions/token/make-refresh-token-key';
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
        test('session token is blacklisted', async () => {
            const { sessionToken, refreshToken } = await createUser(UserRole.EDITOR);
            await testKit.agent
                .post(testKit.urls.logout)
                .set('Authorization', `Bearer ${sessionToken}`)
                .send({ refreshToken })
                .expect(status2xx);
            const sessionJti = testKit.sessionJwt.verify(sessionToken)!.jti;
            const blacklisted = await testKit.jwtBlacklistService.tokenInBlacklist(
                JwtTypes.session,
                sessionJti,
            );
            expect(blacklisted).toBeTruthy();
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

        test('old refresh token is deleted from refresh tokens index in Redis', async () => {
            const { refreshToken, id, sessionToken } = await createUser(getRandomRole());
            await testKit.agent
                .post(testKit.urls.logout)
                .set('Authorization', `Bearer ${sessionToken}`)
                .send({ refreshToken })
                .expect(status2xx);
            const { jti } = testKit.refreshJwt.verify(refreshToken)!;
            const redisKey = makeRefreshTokenIndexKey(id);
            const inRedis = await testKit.redisService.belongsToSet(redisKey, jti);
            expect(inRedis).toBeFalsy();
        });

        test('return 204 status code', async () => {
            const { sessionToken, refreshToken } = await createUser(getRandomRole());
            await testKit.agent
                .post(testKit.urls.logout)
                .set('Authorization', `Bearer ${sessionToken}`)
                .send({ refreshToken })
                .expect(204);
        });
    });

    describe(`More than ${rateLimiting[RateLimiter.critical].max} requests in ${rateLimiting[RateLimiter.critical].windowMs / 1000}s`, () => {
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
