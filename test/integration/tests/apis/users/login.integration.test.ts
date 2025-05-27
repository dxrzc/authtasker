import request from 'supertest';
import { testKit } from '@integration/utils';

describe('POST /api/users/login', () => {
    describe('Response - Failure', () => {
        test.concurrent.each(['email', 'password'])
            ('return 400 BAD REQUEST when %s is missing', async (property: string) => {
                const expectedStatus = 400;
                const expectedErrorMssg = `${property} should not be null or undefined`;

                // Delete property
                const user = {
                    email: testKit.userDataGenerator.email(),
                    password: testKit.userDataGenerator.password(),
                } as any;
                delete user[property];

                // Login
                const response = await request(testKit.server)
                    .post(testKit.endpoints.login)
                    .send(user);

                expect(response.body).toStrictEqual({ error: expectedErrorMssg });
                expect(response.statusCode).toBe(expectedStatus);
            });
    });

    describe('Response - Success', () => {
        test.concurrent('return safe and correct data in response (200 OK)', async () => {
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