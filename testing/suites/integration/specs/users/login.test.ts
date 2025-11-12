import { faker } from '@faker-js/faker/.';
import { testKit } from '@integration/kit/test.kit';
import { createUser } from '@integration/utils/create-user.util';
import { status2xx } from '@integration/utils/status-2xx.util';
import { statusCodes } from 'src/constants/status-codes.constants';
import { authErrors } from 'src/messages/auth.error.messages';
import { makeRefreshTokenIndexKey } from 'src/functions/token/make-refresh-token-index-key';
import { makeRefreshTokenKey } from 'src/functions/token/make-refresh-token-key';

describe(`POST ${testKit.urls.login}`, () => {
    describe('Successful login', () => {
        test('return a valid refresh token', async () => {
            const { email, unhashedPassword } = await createUser();
            const { body } = await testKit.agent
                .post(testKit.urls.login)
                .send({ email, password: unhashedPassword })
                .expect(status2xx);
            expect(body.refreshToken).toBeDefined();
            expect(testKit.refreshJwt.verify(body.refreshToken)).not.toBeNull();
        });

        test('refresh token is stored in Redis', async () => {
            const { email, unhashedPassword } = await createUser();
            const { body } = await testKit.agent
                .post(testKit.urls.login)
                .send({ email, password: unhashedPassword })
                .expect(status2xx);
            const redisKey = makeRefreshTokenKey(body.user.id, body.refreshToken);
            const inRedis = await testKit.redisService.get(redisKey);
            expect(inRedis).toBeDefined();
        });

        test('refresh token is added to refresh tokens index', async () => {
            const { email, unhashedPassword } = await createUser();
            const { body } = await testKit.agent
                .post(testKit.urls.login)
                .send({ email, password: unhashedPassword })
                .expect(status2xx);
            const { jti } = testKit.refreshJwt.verify(body.refreshToken)!;
            const redisKey = makeRefreshTokenIndexKey(body.user.id);
            const inRedis = await testKit.redisService.belongsToSet(redisKey, jti);
            expect(inRedis).toBeTruthy();
        });

        test('return a valid session token', async () => {
            const { email, unhashedPassword } = await createUser();
            const { body } = await testKit.agent
                .post(testKit.urls.login)
                .send({ email, password: unhashedPassword })
                .expect(status2xx);
            expect(body.sessionToken).toBeDefined();
            expect(testKit.sessionJwt.verify(body.sessionToken)).not.toBeNull();
        });

        test('password is not returned in body', async () => {
            const { email, unhashedPassword } = await createUser();
            const { body } = await testKit.agent
                .post(testKit.urls.login)
                .send({ email, password: unhashedPassword })
                .expect(status2xx);
            expect(body.user.password).toBeUndefined();
        });

        test('return 200 status code, user data and tokens', async () => {
            const { email, unhashedPassword, id } = await createUser();
            const response = await testKit.agent
                .post(testKit.urls.login)
                .send({ email, password: unhashedPassword })
                .expect(status2xx);
            expect(response.statusCode).toBe(statusCodes.OK);
            const userInDb = await testKit.models.user.findById(id).exec();
            expect(userInDb).not.toBeNull();
            expect(response.body).toStrictEqual({
                user: {
                    email: userInDb?.email,
                    role: userInDb?.role,
                    emailValidated: userInDb?.emailValidated,
                    name: userInDb?.name,
                    createdAt: userInDb?.createdAt.toISOString(),
                    updatedAt: userInDb?.updatedAt.toISOString(),
                    id: userInDb?.id,
                },
                sessionToken: expect.any(String),
                refreshToken: expect.any(String),
            });
        });
    });

    describe('Email does not exist', () => {
        test('return 400 status code and invalid credentials error', async () => {
            const res = await testKit.agent.post(testKit.urls.login).send({
                email: testKit.userData.email,
                password: testKit.userData.password,
            });
            expect(res.body).toStrictEqual({ error: authErrors.INVALID_CREDENTIALS });
            expect(res.statusCode).toBe(statusCodes.BAD_REQUEST);
        });
    });

    describe('Password does not match', () => {
        test('return 400 status code and invalid credentials error', async () => {
            const { email } = await createUser();
            const res = await testKit.agent.post(testKit.urls.login).send({
                password: testKit.userData.password,
                email,
            });
            expect(res.body).toStrictEqual({ error: authErrors.INVALID_CREDENTIALS });
            expect(res.statusCode).toBe(statusCodes.BAD_REQUEST);
        });
    });

    describe('Password is too long', () => {
        test('return 400 status code and invalid credentials error', async () => {
            const res = await testKit.agent.post(testKit.urls.login).send({
                password: faker.string.alpha(200),
                email: testKit.userData.email,
            });
            expect(res.body).toStrictEqual({ error: authErrors.INVALID_CREDENTIALS });
            expect(res.statusCode).toBe(statusCodes.BAD_REQUEST);
        });
    });

    describe('Invalid email format', () => {
        test('return 400 status code and invalid credentials error', async () => {
            const res = await testKit.agent.post(testKit.urls.login).send({
                password: testKit.userData.password,
                email: faker.string.alpha(200),
            });
            expect(res.body).toStrictEqual({ error: authErrors.INVALID_CREDENTIALS });
            expect(res.statusCode).toBe(statusCodes.BAD_REQUEST);
        });
    });

    describe('User exceeds the max refresh tokens per user', () => {
        test('return 403 status code and refresh token limit exceed error', async () => {
            const maxRefresh = testKit.configService.MAX_REFRESH_TOKENS_PER_USER;
            const user = testKit.userData.user;
            const loginInfo = {
                email: user.email,
                password: user.password,
            };
            // create assigns one refresh token
            await testKit.agent.post(testKit.urls.register).send(user).expect(status2xx);
            // assign more tokens to reach the limit
            for (let i = 0; i < maxRefresh - 1; i++)
                await testKit.agent.post(testKit.urls.login).send(loginInfo).expect(status2xx);
            const response = await testKit.agent.post(testKit.urls.login).send(loginInfo);
            expect(response.body).toStrictEqual({ error: authErrors.REFRESH_TOKEN_LIMIT_EXCEEDED });
            expect(response.statusCode).toBe(403);
        });
    });
});
