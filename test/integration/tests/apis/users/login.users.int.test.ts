import request from 'supertest';
import { testKit } from '@integration/utils';
import { nameMissingErr } from '@root/validators/errors/user.errors';

describe('POST /api/users/login', () => {
    describe('Input sanitization', () => {
        test.concurrent('return status 400 BAD REQUEST when name is missing', async () => {
            const expectedStatus = 400;
            const expectedErrorMssg = nameMissingErr;

            const response = await request(testKit.server)
                .post(testKit.endpoints.register)
                .send({
                    password: '123'
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

            // Log in
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
    });
});