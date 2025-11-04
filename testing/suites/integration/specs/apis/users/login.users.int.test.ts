import request from 'supertest';
import { faker } from '@faker-js/faker/.';
import { testKit } from '@integration/utils/testKit.util';
import { status2xx } from '@integration/utils/status2xx.util';
import { usersLimits } from 'src/common/constants/user.constants';
import { authErrors } from 'src/common/errors/messages/auth.error.messages';
import { createUser } from '@integration/utils/createUser.util';
import { getRandomRole } from '@test/tools/utilities/get-random-role.util';
import { makeRefreshTokenKey } from 'src/common/logic/token/make-refresh-token-key';
import { commonErrors } from 'src/common/errors/messages/common.error.messages';
import { makeRefreshTokenIndexKey } from 'src/common/logic/token/make-refresh-token-index-key';

describe('POST /api/users/login', () => {
    describe('Input sanitization Wiring', () => {
        test(
            'return status 400 BAD REQUEST INVALID_CREDENTIALS when email is not a valid email',
            async () => {
                const expectedStatus = 400;
                const expectedErrorMssg = authErrors.INVALID_CREDENTIALS;

                const response = await request(testKit.server).post(testKit.endpoints.login).send({
                    email: '11111111111111',
                    password: testKit.userDataGenerator.password(),
                });

                expect(response.body).toStrictEqual({ error: expectedErrorMssg });
                expect(response.statusCode).toBe(expectedStatus);
            },
        );

        test(
            'return status 400 BAD REQUEST INVALID_CREDENTIALS password is too long',
            async () => {
                const expectedStatus = 400;
                const expectedErrorMssg = authErrors.INVALID_CREDENTIALS;

                const response = await request(testKit.server)
                    .post(testKit.endpoints.login)
                    .send({
                        email: testKit.userDataGenerator.email(),
                        password: faker.string.alpha(usersLimits.MAX_PASSWORD_LENGTH + 1),
                    });

                expect(response.body).toStrictEqual({ error: expectedErrorMssg });
                expect(response.statusCode).toBe(expectedStatus);
            },
        );
    });

    describe('Tokens', () => {
        describe('User exceeds the maximum active refresh tokens per user', () => {
            test('return status 403 FORBIDDEN and the configured message', async () => {
                const expectedStatus = 403;
                const maxRefresh = testKit.configService.MAX_REFRESH_TOKENS_PER_USER;
                const user = testKit.userDataGenerator.fullUser();
                const loginInfo = {
                    email: user.email,
                    password: user.password,
                };
                // create assigns one refresh token
                await request(testKit.server)
                    .post(testKit.endpoints.register)
                    .send(user)
                    .expect(status2xx);
                // assign more tokens to reach the limit
                for (let i = 0; i < maxRefresh - 1; i++) {
                    await request(testKit.server)
                        .post(testKit.endpoints.login)
                        .send(loginInfo)
                        .expect(status2xx);
                }
                // limit exceeded here
                const response = await request(testKit.server)
                    .post(testKit.endpoints.login)
                    .send(loginInfo);
                expect(response.body).toStrictEqual({
                    error: authErrors.REFRESH_TOKEN_LIMIT_EXCEEDED,
                });
                expect(response.statusCode).toBe(expectedStatus);
            });
        });

        test('Store the returned refresh token id in refreshs-tokens db (redis)', async () => {
            const {
                unhashedPassword: password,
                userEmail: email,
                userId,
            } = await createUser(getRandomRole());
            const response = await request(testKit.server)
                .post(testKit.endpoints.login)
                .send({ email, password })
                .expect(status2xx);
            // jti in redis db
            const refreshJti = testKit.refreshJwt.verify(response.body.refreshToken)?.jti!;
            await expect(
                testKit.redisService.get(makeRefreshTokenKey(userId, refreshJti)),
            ).resolves.not.toBeNull();
        });

        test('Store the returned refresh token in user count set (redis)', async () => {
            const {
                unhashedPassword: password,
                userEmail: email,
                userId,
            } = await createUser(getRandomRole());
            const response = await request(testKit.server)
                .post(testKit.endpoints.login)
                .send({ email, password })
                .expect(status2xx);
            // jti in user set
            const refreshJti = testKit.refreshJwt.verify(response.body.refreshToken)?.jti!;
            await expect(
                testKit.redisService.belongsToSet(makeRefreshTokenIndexKey(userId), refreshJti),
            ).resolves.toBeTruthy();
        });
    });

    describe('Invalid credentials', () => {
        test('return 400 BAD REQUEST if password does not correspond to the provided email', async () => {
            const expectedStatus = 400;
            const expectedErrorMssg = authErrors.INVALID_CREDENTIALS;

            // create user
            const user = testKit.userDataGenerator.fullUser();
            await request(testKit.server)
                .post(testKit.endpoints.register)
                .send(user)
                .expect(status2xx);

            // login with wrong password
            const response = await request(testKit.server)
                .post(testKit.endpoints.login)
                .send({
                    email: user.email,
                    password: faker.string.alpha(usersLimits.MIN_PASSWORD_LENGTH),
                });

            expect(response.body).toStrictEqual({ error: expectedErrorMssg });
            expect(response.statusCode).toBe(expectedStatus);
        });

        test('return 400 BAD REQUEST if email does not exist', async () => {
            const expectedStatus = 400;
            const expectedErrorMssg = authErrors.INVALID_CREDENTIALS;

            const response = await request(testKit.server)
                .post(testKit.endpoints.login)
                .send({
                    email: testKit.userDataGenerator.email(),
                    password: faker.string.alpha(usersLimits.MIN_PASSWORD_LENGTH),
                });

            expect(response.body).toStrictEqual({ error: expectedErrorMssg });
            expect(response.statusCode).toBe(expectedStatus);
        });
    });

    describe('Max Auth-API rate limit reached', () => {
        test(
            'return 429 TOO MANY REQUESTS and the configured error message',
            async () => {
                const expectedStatus = 429;
                const expectedErrorMssg = commonErrors.TOO_MANY_REQUESTS;
                const maxRequests = testKit.configService.AUTH_MAX_REQ_PER_MINUTE;
                const { userEmail } = await createUser(getRandomRole());
                // fail login requests until the rate limit is reached
                for (let i = 0; i < maxRequests; i++) {
                    await request(testKit.server)
                        .post(testKit.endpoints.login)
                        .send({ email: userEmail, password: 'bad-password' });
                }
                const response = await request(testKit.server)
                    .post(testKit.endpoints.login)
                    .send({ email: userEmail, password: 'bad-password' });
                expect(response.statusCode).toBe(expectedStatus);
                expect(response.body).toStrictEqual({ error: expectedErrorMssg });
            },
        );
    });

    describe('Response', () => {
        test(
            'return 200 OK and correct data (same data, no password, etc)',
            async () => {
                const expectedStatus = 200;
                const user = testKit.userDataGenerator.fullUser();

                // Create user
                await request(testKit.server).post(testKit.endpoints.register).send(user);

                // Login
                const loginResponse = await request(testKit.server)
                    .post(testKit.endpoints.login)
                    .send({
                        email: user.email,
                        password: user.password,
                    });

                const userInDb = await testKit.userModel.findOne({ email: user.email });
                expect(loginResponse.body).toStrictEqual({
                    user: {
                        name: userInDb!.name,
                        email: userInDb!.email,
                        role: userInDb!.role,
                        emailValidated: userInDb!.emailValidated,
                        createdAt: userInDb!.createdAt.toISOString(),
                        updatedAt: userInDb!.updatedAt.toISOString(),
                        id: userInDb!.id,
                    },
                    sessionToken: expect.any(String),
                    refreshToken: expect.any(String),
                });
                expect(loginResponse.statusCode).toBe(expectedStatus);
            },
        );

        test('return a valid session and refresh token', async () => {
            const user = testKit.userDataGenerator.fullUser();
            // create user
            await request(testKit.server).post(testKit.endpoints.register).send(user);
            // login
            const loginResponse = await request(testKit.server).post(testKit.endpoints.login).send({
                email: user.email,
                password: user.password,
            });
            // session
            const sessionToken = loginResponse.body.sessionToken;
            expect(sessionToken).toBeDefined();
            expect(testKit.sessionJwt.verify(sessionToken)).not.toBeNull();
            // refresh
            const refreshToken = loginResponse.body.refreshToken;
            expect(refreshToken).toBeDefined();
            expect(testKit.refreshJwt.verify(refreshToken)).not.toBeNull();
        });
    });
});
