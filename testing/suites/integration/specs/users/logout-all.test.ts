import { faker } from '@faker-js/faker/.';
import { testKit } from '@integration/kit/test.kit';
import { createUser } from '@integration/utils/create-user.util';
import { status2xx } from '@integration/utils/status-2xx.util';
import { getRandomRole } from '@test/tools/utilities/get-random-role.util';
import { rateLimiting } from 'src/constants/rate-limiting.constants';
import { statusCodes } from 'src/constants/status-codes.constants';
import { usersLimits } from 'src/constants/user.constants';
import { RateLimiter } from 'src/enums/rate-limiter.enum';
import { makeRefreshTokenIndexKey } from 'src/functions/token/make-refresh-token-index-key';
import { makeRefreshTokenKey } from 'src/functions/token/make-refresh-token-key';
import { authErrors } from 'src/messages/auth.error.messages';
import { commonErrors } from 'src/messages/common.error.messages';
import { usersApiErrors } from 'src/messages/users-api.error.messages';

describe(`POST ${testKit.urls.logoutAll}`, () => {
    describe('Successful logoutAll', () => {
        test('return 204 status code', async () => {
            const { email, unhashedPassword } = await createUser(getRandomRole());
            await testKit.agent
                .post(testKit.urls.logoutAll)
                .send({ email, password: unhashedPassword })
                .expect(204);
        });

        test('delete all the refresh tokens from Redis', async () => {
            // register (token 1)
            const {
                refreshToken: refreshTkn1,
                email,
                unhashedPassword,
                id,
            } = await createUser(getRandomRole());
            // login (token 2)
            const { body } = await testKit.agent
                .post(testKit.urls.login)
                .send({ email, password: unhashedPassword })
                .expect(status2xx);
            const refreshTkn2 = body.refreshToken;
            // logout all
            await testKit.agent
                .post(testKit.urls.logoutAll)
                .send({ email, password: unhashedPassword })
                .expect(status2xx);
            // get jtis
            const { jti: tkn1Jti } = testKit.refreshJwt.verify(refreshTkn1)!;
            const { jti: tkn2Jti } = testKit.refreshJwt.verify(refreshTkn2)!;
            const tkn1InRedis = await testKit.redisService.get(makeRefreshTokenKey(id, tkn1Jti));
            const tkn2InRedis = await testKit.redisService.get(makeRefreshTokenKey(id, tkn2Jti));
            expect(tkn1InRedis).toBeNull();
            expect(tkn2InRedis).toBeNull();
        });

        test('delete all the refresh tokens from index in Redis', async () => {
            // register (token 1)
            const { email, unhashedPassword, id } = await createUser(getRandomRole());
            const indexKey = makeRefreshTokenIndexKey(id);
            // login (token 2)
            await testKit.agent
                .post(testKit.urls.login)
                .send({ email, password: unhashedPassword })
                .expect(status2xx);
            // index size should be 2
            await expect(testKit.redisService.getSetSize(indexKey)).resolves.toBe(2);
            // logout all
            await testKit.agent
                .post(testKit.urls.logoutAll)
                .send({ email, password: unhashedPassword })
                .expect(status2xx);
            // index size should be 0
            const indexSize = await testKit.redisService.getSetSize(indexKey);
            expect(indexSize).toBe(0);
        });
    });

    describe('Invalid password length', () => {
        test(`return 400 status code and invalid credentials error message`, async () => {
            const { email } = await createUser(getRandomRole());
            const response = await testKit.agent.post(testKit.urls.logoutAll).send({
                password: faker.string.alpha(usersLimits.MAX_PASSWORD_LENGTH + 1),
                email,
            });
            expect(response.body).toStrictEqual({ error: authErrors.INVALID_CREDENTIALS });
            expect(response.statusCode).toBe(400);
        });
    });

    describe('Password does not match user in email', () => {
        test(`return 400 status code and invalid credentials error message`, async () => {
            const { email } = await createUser(getRandomRole());
            const response = await testKit.agent.post(testKit.urls.logoutAll).send({
                password: testKit.userData.password,
                email,
            });
            expect(response.body).toStrictEqual({ error: authErrors.INVALID_CREDENTIALS });
            expect(response.statusCode).toBe(400);
        });
    });

    describe('Email does not exist', () => {
        test(`return 404 status code and user not found error message`, async () => {
            const response = await testKit.agent.post(testKit.urls.logoutAll).send({
                password: testKit.userData.password,
                email: testKit.userData.email,
            });
            expect(response.body).toStrictEqual({ error: usersApiErrors.NOT_FOUND });
            expect(response.statusCode).toBe(404);
        });
    });

    describe(`More than ${rateLimiting[RateLimiter.critical].max} requests in ${rateLimiting[RateLimiter.critical].windowMs / 1000}s`, () => {
        test(`return 429 status code and too many requests error message`, async () => {
            const ip = faker.internet.ip();
            const { email, unhashedPassword } = await createUser(getRandomRole());
            for (let i = 0; i < rateLimiting[RateLimiter.critical].max; i++) {
                await testKit.agent
                    .post(testKit.urls.logoutAll)
                    .set('X-Forwarded-For', ip)
                    .send({ email, password: unhashedPassword });
            }
            const response = await testKit.agent
                .post(testKit.urls.logoutAll)
                .set('X-Forwarded-For', ip)
                .send({ email, password: unhashedPassword });
            expect(response.body).toStrictEqual({ error: commonErrors.TOO_MANY_REQUESTS });
            expect(response.statusCode).toBe(statusCodes.TOO_MANY_REQUESTS);
        });
    });
});
