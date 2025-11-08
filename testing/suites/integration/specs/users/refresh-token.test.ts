import { testKit } from '@integration/kit/test.kit';
import { createUser } from '@integration/utils/create-user.util';
import { status2xx } from '@integration/utils/status-2xx.util';
import { getRandomRole } from '@test/tools/utilities/get-random-role.util';
import { authErrors } from 'src/messages/auth.error.messages';
import { RateLimiter } from 'src/enums/rate-limiter.enum';
import { rateLimiting } from 'src/constants/rate-limiting.constants';
import { commonErrors } from 'src/messages/common.error.messages';
import { faker } from '@faker-js/faker';
import { statusCodes } from 'src/constants/status-codes.constants';
import { makeRefreshTokenKey } from 'src/functions/token/make-refresh-token-key';
import { makeRefreshTokenIndexKey } from 'src/functions/token/make-refresh-token-index-key';

describe(`POST ${testKit.urls.refreshToken}`, () => {
    describe('Refresh token is not provided in body', () => {
        test(`return 400 status code ${authErrors.REFRESH_TOKEN_NOT_PROVIDED_IN_BODY} message`, async () => {
            const { statusCode, body } = await testKit.agent.post(testKit.urls.refreshToken);
            expect(body).toStrictEqual({ error: authErrors.REFRESH_TOKEN_NOT_PROVIDED_IN_BODY });
            expect(statusCode).toBe(400);
        });
    });

    describe('Session token provided instead of refresh token', () => {
        test(`return 401 status code and  ${authErrors.INVALID_TOKEN} message`, async () => {
            const { body, statusCode } = await testKit.agent.post(testKit.urls.refreshToken).send({
                // session token
                refreshToken: testKit.sessionJwt.generate('1m', {
                    id: 'non-existent-user-id',
                }),
            });
            expect(body).toStrictEqual({ error: authErrors.INVALID_TOKEN });
            expect(statusCode).toBe(401);
        });
    });

    describe('User in token does not exist', () => {
        test(`return 401 status code and ${authErrors.INVALID_TOKEN} message`, async () => {
            const { refreshToken, id } = await createUser(getRandomRole());
            await testKit.models.user.findByIdAndDelete(id);
            const { body, statusCode } = await testKit.agent
                .post(testKit.urls.refreshToken)
                .send({ refreshToken });
            expect(body).toStrictEqual({ error: authErrors.INVALID_TOKEN });
            expect(statusCode).toBe(401);
        });
    });

    describe('Token successfully refreshed', () => {
        test('return a valid session token', async () => {
            const { refreshToken } = await createUser(getRandomRole());
            const { body } = await testKit.agent
                .post(testKit.urls.refreshToken)
                .send({ refreshToken })
                .expect(status2xx);
            const sessionToken = body.sessionToken;
            expect(testKit.sessionJwt.verify(sessionToken)).not.toBeNull();
        });

        test('return a valid new refresh token', async () => {
            const { refreshToken } = await createUser(getRandomRole());
            const { body } = await testKit.agent
                .post(testKit.urls.refreshToken)
                .send({ refreshToken })
                .expect(status2xx);
            const newRefreshToken = body.refreshToken;
            expect(testKit.refreshJwt.verify(newRefreshToken)).not.toBeNull();
        });

        test('new refresh token is different from the sent one but conserves the expiration date', async () => {
            const { refreshToken } = await createUser(getRandomRole());
            const { body } = await testKit.agent
                .post(testKit.urls.refreshToken)
                .send({ refreshToken })
                .expect(status2xx);
            // tokens should be different
            const newRefreshToken = body.refreshToken;
            expect(newRefreshToken).not.toBe(refreshToken);
            // same exp date
            const prevTokenExp = testKit.refreshJwt.verify(refreshToken)!.exp!;
            const newTokenExp = testKit.refreshJwt.verify(newRefreshToken)!.exp!;
            expect(Math.abs(newTokenExp - prevTokenExp)).toBeLessThanOrEqual(1);
        });

        test('return status 200 and new refresh and session tokens in body', async () => {
            const { refreshToken } = await createUser(getRandomRole());
            const { body } = await testKit.agent
                .post(testKit.urls.refreshToken)
                .send({ refreshToken })
                .expect(200);
            expect(body.sessionToken).toBeDefined();
            expect(body.refreshToken).toBeDefined();
        });

        test('old refresh token should be deleted from Redis', async () => {
            const { refreshToken, id } = await createUser(getRandomRole());
            await testKit.agent
                .post(testKit.urls.refreshToken)
                .send({ refreshToken })
                .expect(status2xx);
            const { jti } = testKit.refreshJwt.verify(refreshToken)!;
            const redisKey = makeRefreshTokenKey(id, jti);
            const inRedis = await testKit.redisService.get(redisKey);
            expect(inRedis).toBeNull();
        });

        test('old refresh token should be deleted from refresh tokens index in Redis', async () => {
            const { refreshToken, id } = await createUser(getRandomRole());
            await testKit.agent
                .post(testKit.urls.refreshToken)
                .send({ refreshToken })
                .expect(status2xx);
            const { jti } = testKit.refreshJwt.verify(refreshToken)!;
            const redisKey = makeRefreshTokenIndexKey(id);
            const inRedis = await testKit.redisService.belongsToSet(redisKey, jti);
            expect(inRedis).toBeFalsy();
        });

        test('new refresh token should be stored in Redis', async () => {
            const { refreshToken, id } = await createUser(getRandomRole());
            await testKit.agent
                .post(testKit.urls.refreshToken)
                .send({ refreshToken })
                .expect(status2xx);
            const { jti } = testKit.refreshJwt.verify(refreshToken)!;
            const redisKey = makeRefreshTokenKey(id, jti);
            const inRedis = await testKit.redisService.get(redisKey);
            expect(inRedis).toBeDefined();
        });

        test('new refresh token should be stored in refresh tokens index in Redis', async () => {
            const { refreshToken, id } = await createUser(getRandomRole());
            await testKit.agent
                .post(testKit.urls.refreshToken)
                .send({ refreshToken })
                .expect(status2xx);
            const { jti } = testKit.refreshJwt.verify(refreshToken)!;
            const redisKey = makeRefreshTokenIndexKey(id);
            const inRedis = await testKit.redisService.belongsToSet(redisKey, jti);
            expect(inRedis).toBeTruthy();
        });
    });

    describe(`More than ${rateLimiting[RateLimiter.critical].max} requests in ${rateLimiting[RateLimiter.critical].windowMs / 1000}s`, () => {
        test('should return 429 status code and TOO_MANY_REQUESTS message', async () => {
            const ip = faker.internet.ip();
            for (let i = 0; i < rateLimiting[RateLimiter.critical].max; i++) {
                await testKit.agent
                    .post(testKit.urls.refreshToken)
                    .set('X-Forwarded-For', ip)
                    .send({});
            }
            const response = await testKit.agent
                .post(testKit.urls.refreshToken)
                .set('X-Forwarded-For', ip)
                .send({});
            expect(response.body).toStrictEqual({ error: commonErrors.TOO_MANY_REQUESTS });
            expect(response.statusCode).toBe(statusCodes.TOO_MANY_REQUESTS);
        });
    });
});
