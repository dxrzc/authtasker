import request from 'supertest';
import { faker } from '@faker-js/faker/.';
import { testKit } from '@integration/utils/testKit.util';
import { status2xx } from '@integration/utils/status2xx.util';
import { commonErrors } from 'src/common/errors/messages/common.error.messages';
import { usersApiErrors } from 'src/common/errors/messages/users-api.error.messages';

describe('POST /api/users/register', () => {
    describe('Input Sanitization Wiring', () => {
        test.only('return status 400 BAD REQUEST when email is not a valid email', async () => {
            const expectedStatus = 400;
            const expectedErrorMssg = usersApiErrors.INVALID_EMAIL;

            // Create user with invalid email
            const user = testKit.userDataGenerator.fullUser();
            user.email = faker.string.alpha(10); // Invalid email
            const response = await request(testKit.server)
                .post(testKit.endpoints.register)
                .send(user);
            console.log(response.body);
            expect(response.body).toStrictEqual({ error: expectedErrorMssg });
            expect(response.statusCode).toBe(expectedStatus);
        });

        test('return status 400 BAD REQUEST when a unexpected property is provided', async () => {
            const expectedStatus = 400;
            const expectedErrorMssg = commonErrors.UNEXPECTED_PROPERTY_PROVIDED;

            const response = await request(testKit.server)
                .post(testKit.endpoints.register)
                .send({
                    ...testKit.userDataGenerator.fullUser(),
                    role: 'admin',
                });

            expect(response.body).toStrictEqual({ error: expectedErrorMssg });
            expect(response.statusCode).toBe(expectedStatus);
        });
    });

    describe('Database Operations', () => {
        test('create user with correct data in db', async () => {
            // Create user
            const user = testKit.userDataGenerator.fullUser();
            await request(testKit.server)
                .post(testKit.endpoints.register)
                .send(user)
                .expect(status2xx);

            // Verify DB persistence
            const userInDb = await testKit.userModel.findOne({ email: user.email }).exec();
            expect(userInDb).toBeDefined();

            // Verify transformations
            expect(userInDb!.name).toBe(user.name.toLowerCase());
            await expect(
                testKit.hashingService.compare(user.password, userInDb!.password),
            ).resolves.toBeTruthy();

            // Verify unmodified values
            expect(userInDb!.email).toBe(user.email);

            // Verify default values
            expect(userInDb!.role).toBe('readonly');
            expect(userInDb!.emailValidated).toBe(false);
            expect(userInDb!.createdAt).toBeDefined();
            expect(userInDb!.updatedAt).toBeDefined();
        });

        test('return 409 CONFLICT when user email already exists', async () => {
            const expectedStatus = 409;
            const expectedErrorMssg = usersApiErrors.USER_ALREADY_EXISTS;
            // create
            const firstUser = await request(testKit.server)
                .post(testKit.endpoints.register)
                .send(testKit.userDataGenerator.fullUser())
                .expect(status2xx);
            const usedEmail = firstUser.body.user.email;
            // add some delay
            await new Promise((res) => setTimeout(res, 500));
            // create another user with same email
            const response = await request(testKit.server)
                .post(testKit.endpoints.register)
                .send({
                    ...testKit.userDataGenerator.fullUser(),
                    email: usedEmail,
                });
            expect(response.body).toStrictEqual({ error: expectedErrorMssg });
            expect(response.statusCode).toBe(expectedStatus);
        });

        test('return 409 CONFLICT when user name already exists', async () => {
            const expectedStatus = 409;
            const expectedErrorMssg = usersApiErrors.USER_ALREADY_EXISTS;
            // create
            const firstUser = await request(testKit.server)
                .post(testKit.endpoints.register)
                .send(testKit.userDataGenerator.fullUser())
                .expect(status2xx);
            const usedName = firstUser.body.user.name;
            // add some delay
            await new Promise((res) => setTimeout(res, 500));
            // create another user with same name
            const response = await request(testKit.server)
                .post(testKit.endpoints.register)
                .send({
                    ...testKit.userDataGenerator.fullUser(),
                    name: usedName,
                });
            expect(response.body).toStrictEqual({ error: expectedErrorMssg });
            expect(response.statusCode).toBe(expectedStatus);
        });
    });

    describe('Response', () => {
        test('return 201 CREATED and correct data (same data, no password, etc)', async () => {
            const expectedStatus = 201;

            // Create user
            const user = testKit.userDataGenerator.fullUser();
            const response = await request(testKit.server)
                .post(testKit.endpoints.register)
                .send(user);

            const userInDb = await testKit.userModel.findOne({ email: user.email });
            expect(response.body).toStrictEqual({
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
            expect(response.statusCode).toBe(expectedStatus);
        });

        test('return a valid session and refresh token', async () => {
            const user = testKit.userDataGenerator.fullUser();
            // Create user
            const registerResponse = await request(testKit.server)
                .post(testKit.endpoints.register)
                .send(user);
            // session
            const sessionToken = registerResponse.body.sessionToken;
            expect(sessionToken).toBeDefined();
            expect(testKit.sessionJwt.verify(sessionToken)).not.toBeNull();
            // refresh
            const refreshToken = registerResponse.body.refreshToken;
            expect(refreshToken).toBeDefined();
            expect(testKit.refreshJwt.verify(refreshToken)).not.toBeNull();
        });
    });
});
