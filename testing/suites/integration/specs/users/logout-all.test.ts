import { faker } from '@faker-js/faker';
import { testKit } from '@integration/kit/test.kit';
import { createUser } from '@integration/utils/create-user.util';
import { status2xx } from '@integration/utils/status-2xx.util';
import { getRandomRole } from '@test/tools/utilities/get-random-role.util';
import { statusCodes } from 'src/constants/status-codes.constants';
import { usersLimits } from 'src/constants/user.constants';
import { RateLimiter } from 'src/enums/rate-limiter.enum';
import { UserRole } from 'src/enums/user-role.enum';
import { makeRefreshTokenIndexKey } from 'src/functions/token/make-refresh-token-index-key';
import { makeRefreshTokenKey } from 'src/functions/token/make-refresh-token-key';
import { makeSessionTokenBlacklistKey } from 'src/functions/token/make-session-token-blacklist-key';
import { authErrors } from 'src/messages/auth.error.messages';
import { commonErrors } from 'src/messages/common.error.messages';
import { usersApiErrors } from 'src/messages/users-api.error.messages';
import { rateLimitingSettings } from 'src/settings/rate-limiting.settings';

describe(`POST ${testKit.urls.logoutAll}`, () => {
    describe('Session token not provided', () => {
        test('return 401 status code and invalid token error message', async () => {
            const response = await testKit.agent
                .post(testKit.urls.logoutAll)
                .send({ password: faker.internet.password() });
            expect(response.body).toStrictEqual({ error: authErrors.INVALID_TOKEN });
            expect(response.statusCode).toBe(401);
        });
    });

    test('readonly users can logout all', async () => {
        const { sessionToken, unhashedPassword } = await createUser(UserRole.READONLY);
        await testKit.agent
            .post(testKit.urls.logoutAll)
            .set('Authorization', `Bearer ${sessionToken}`)
            .send({ password: unhashedPassword })
            .expect(status2xx);
    });

    describe('Successful logoutAll', () => {
        test('return 204 status code and empty body', async () => {
            const { sessionToken, unhashedPassword } = await createUser(getRandomRole());
            const response = await testKit.agent
                .post(testKit.urls.logoutAll)
                .set('Authorization', `Bearer ${sessionToken}`)
                .send({ password: unhashedPassword });
            expect(response.body).toStrictEqual({});
            expect(response.statusCode).toBe(204);
        });

        test('blacklist provided session token', async () => {
            const { unhashedPassword, sessionToken } = await createUser(getRandomRole());
            const { jti } = testKit.sessionJwt.verify(sessionToken)!;
            const blacklistKey = makeSessionTokenBlacklistKey(jti);
            // not blacklisted yet
            await expect(testKit.redisService.get(blacklistKey)).resolves.toBeNull();
            // logout-all
            await testKit.agent
                .post(testKit.urls.logoutAll)
                .set('Authorization', `Bearer ${sessionToken}`)
                .send({ password: unhashedPassword })
                .expect(status2xx);
            const blacklisted = await testKit.redisService.get(blacklistKey);
            expect(blacklisted).not.toBeNull();
        });

        test('delete all the refresh tokens from Redis', async () => {
            const { id, unhashedPassword, sessionToken } = await createUser(getRandomRole());
            const { jti: tokenJti1 } = await testKit.refreshTokenService.generate(id, {
                meta: true,
            });
            const { jti: tokenJti2 } = await testKit.refreshTokenService.generate(id, {
                meta: true,
            });
            const token1RedisKey = makeRefreshTokenKey(id, tokenJti1);
            const token2RedisKey = makeRefreshTokenKey(id, tokenJti2);
            // both tokens exist in redis
            await expect(testKit.redisService.get(token1RedisKey)).resolves.not.toBeNull();
            await expect(testKit.redisService.get(token2RedisKey)).resolves.not.toBeNull();
            // logout-all
            await testKit.agent
                .post(testKit.urls.logoutAll)
                .set('Authorization', `Bearer ${sessionToken}`)
                .send({ password: unhashedPassword })
                .expect(status2xx);
            // tokens should have been removed from redis store
            await expect(testKit.redisService.get(token1RedisKey)).resolves.toBeNull();
            await expect(testKit.redisService.get(token2RedisKey)).resolves.toBeNull();
        });

        test('clear user refresh token index in Redis', async () => {
            const { id, unhashedPassword, sessionToken } = await createUser(getRandomRole());
            const { jti: tokenJti1 } = await testKit.refreshTokenService.generate(id, {
                meta: true,
            });
            const { jti: tokenJti2 } = await testKit.refreshTokenService.generate(id, {
                meta: true,
            });
            const refreshTokenIndexKey = makeRefreshTokenIndexKey(id);
            // both tokens exist in refresh token index
            await expect(
                testKit.redisService.belongsToList(refreshTokenIndexKey, tokenJti1),
            ).resolves.toBeTruthy();
            await expect(
                testKit.redisService.belongsToList(refreshTokenIndexKey, tokenJti2),
            ).resolves.toBeTruthy();
            // logout-all
            await testKit.agent
                .post(testKit.urls.logoutAll)
                .set('Authorization', `Bearer ${sessionToken}`)
                .send({ password: unhashedPassword })
                .expect(status2xx);
            // refresh token index should be cleared
            const indexContents = await testKit.redisService.getListSize(refreshTokenIndexKey);
            expect(indexContents).toBe(0);
        });
    });

    describe('Password not provided', () => {
        test('return status 400 status code and password not provided error message', async () => {
            const { sessionToken } = await createUser(getRandomRole());
            const response = await testKit.agent
                .post(testKit.urls.logoutAll)
                .set('Authorization', `Bearer ${sessionToken}`)
                .send({});
            expect(response.body).toStrictEqual({ error: usersApiErrors.PASSWORD_NOT_PROVIDED });
            expect(response.statusCode).toBe(400);
        });
    });

    describe('Invalid password length', () => {
        test('return 401 status code and invalid credentials error message', async () => {
            const { sessionToken } = await createUser(getRandomRole());
            const response = await testKit.agent
                .post(testKit.urls.logoutAll)
                .set('Authorization', `Bearer ${sessionToken}`)
                .send({
                    password: faker.string.alpha(usersLimits.MAX_PASSWORD_LENGTH + 1),
                });
            expect(response.body).toStrictEqual({ error: authErrors.INVALID_CREDENTIALS });
            expect(response.statusCode).toBe(401);
        });
    });

    describe('Password does not match user in session token', () => {
        test('return 401 status code and invalid credentials error message', async () => {
            const { sessionToken } = await createUser(getRandomRole());
            const response = await testKit.agent
                .post(testKit.urls.logoutAll)
                .set('Authorization', `Bearer ${sessionToken}`)
                .send({ password: testKit.userData.password });
            expect(response.body).toStrictEqual({ error: authErrors.INVALID_CREDENTIALS });
            expect(response.statusCode).toBe(401);
        });
    });

    describe('Too many requests', () => {
        test('return 429 status code and too many requests error message', async () => {
            const ip = faker.internet.ip();
            const { unhashedPassword, sessionToken } = await createUser(getRandomRole());
            for (let i = 0; i < rateLimitingSettings[RateLimiter.critical].max; i++) {
                await testKit.agent
                    .post(testKit.urls.logoutAll)
                    .set('X-Forwarded-For', ip)
                    .set('Authorization', `Bearer ${sessionToken}`)
                    .send({ password: unhashedPassword });
            }
            const response = await testKit.agent
                .post(testKit.urls.logoutAll)
                .set('X-Forwarded-For', ip)
                .set('Authorization', `Bearer ${sessionToken}`)
                .send({ password: unhashedPassword });
            expect(response.body).toStrictEqual({ error: commonErrors.TOO_MANY_REQUESTS });
            expect(response.statusCode).toBe(statusCodes.TOO_MANY_REQUESTS);
        });
    });
});
