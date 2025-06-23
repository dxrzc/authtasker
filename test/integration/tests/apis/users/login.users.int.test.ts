import request from 'supertest';
import { faker } from '@faker-js/faker/.';
import { testKit } from '@integration/utils/testKit.util';
import { status2xx } from '@integration/utils/status2xx.util';
import { usersLimits } from '@root/common/constants/user.constants';
import { authErrors } from '@root/common/errors/messages/auth.error.messages';
import { usersApiErrors } from '@root/common/errors/messages/users-api.error.messages';

describe('POST /api/users/login', () => {
    describe('Input sanitization Wiring', () => {
        test.concurrent('return status 400 BAD REQUEST when email is not a valid email', async () => {
            const expectedStatus = 400;
            const expectedErrorMssg = usersApiErrors.INVALID_EMAIL;

            const response = await request(testKit.server)
                .post(testKit.endpoints.login)
                .send({
                    email: '11111111111111',
                    password: testKit.userDataGenerator.password()
                });

            expect(response.body).toStrictEqual({ error: expectedErrorMssg });
            expect(response.statusCode).toBe(expectedStatus);
        });

        test.concurrent('return status 400 BAD REQUEST password is too long', async () => {
            const expectedStatus = 400;
            const expectedErrorMssg = usersApiErrors.INVALID_PASSWORD_LENGTH;

            const response = await request(testKit.server)
                .post(testKit.endpoints.login)
                .send({
                    email: testKit.userDataGenerator.email(),
                    password: faker.string.alpha(usersLimits.MAX_PASSWORD_LENGTH + 1)
                });

            expect(response.body).toStrictEqual({ error: expectedErrorMssg });
            expect(response.statusCode).toBe(expectedStatus);
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
                    password: faker.string.alpha(usersLimits.MIN_PASSWORD_LENGTH)
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
                    password: faker.string.alpha(usersLimits.MIN_PASSWORD_LENGTH)
                });

            expect(response.body).toStrictEqual({ error: expectedErrorMssg });
            expect(response.statusCode).toBe(expectedStatus);
        });
    });

    describe('Response', () => {
        test.concurrent('return 200 OK and correct data (same data, no password, etc)', async () => {
            const expectedStatus = 200;
            const user = testKit.userDataGenerator.fullUser();

            // Create user
            await request(testKit.server)
                .post(testKit.endpoints.register)
                .send(user);

            // Login
            const loginResponse = await request(testKit.server)
                .post(testKit.endpoints.login)
                .send({
                    email: user.email,
                    password: user.password
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
                refreshToken: expect.any(String)
            });
            expect(loginResponse.statusCode).toBe(expectedStatus);
        });

        test.concurrent('return a valid session and refresh token', async () => {
            const user = testKit.userDataGenerator.fullUser();
            // create user
            await request(testKit.server)
                .post(testKit.endpoints.register)
                .send(user);
            // login
            const loginResponse = await request(testKit.server)
                .post(testKit.endpoints.login)
                .send({
                    email: user.email,
                    password: user.password
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