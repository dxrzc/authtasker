import { faker } from '@faker-js/faker/.';
import request from 'supertest';
import { usersApiErrors } from '@root/common/errors/messages';
import { usersLimits } from '@root/common/constants';
import { testKit } from '@integration/utils';

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
                token: expect.any(String)
            });
            expect(loginResponse.statusCode).toBe(expectedStatus);
        });

        test.concurrent('return a valid session token', async () => {
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

            // Verify the token
            const token = loginResponse.body.token;
            const payload = testKit.jwtService.verify(token);
            expect(payload).not.toBeNull();
        });
    });
});