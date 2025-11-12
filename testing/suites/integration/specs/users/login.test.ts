import { faker } from '@faker-js/faker/.';
import { testKit } from '@integration/kit/test.kit';
import { createUser } from '@integration/utils/create-user.util';
import { status2xx } from '@integration/utils/status-2xx.util';
import { statusCodes } from 'src/constants/status-codes.constants';
import { authErrors } from 'src/messages/auth.error.messages';

describe(`POST ${testKit.urls.login}`, () => {
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
