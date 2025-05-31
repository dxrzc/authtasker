import request from 'supertest';
import { faker } from '@faker-js/faker/.';
import { status2xx, testKit } from '@integration/utils';

describe('POST /api/users/register', () => {
    describe('Input Sanitization', () => {
        describe('Validation Rules Wiring', () => {
            test.concurrent('return status 400 BAD REQUEST when email is not a valid email', async () => {
                const expectedStatus = 400;
                const expectedErrorMssg = 'email must be an email';

                // Create user with invalid email
                const user = testKit.userDataGenerator.fullUser();
                user.email = faker.string.alpha(10); // Invalid email
                const response = await request(testKit.server)
                    .post(testKit.endpoints.register)
                    .send(user);

                expect(response.body).toStrictEqual({ error: expectedErrorMssg });
                expect(response.statusCode).toBe(expectedStatus);
            });

            test.concurrent('return status 400 BAD REQUEST when a property is missing', async () => {
                const properties = ['name', 'email', 'password'];
                const randomProp = properties[Math.floor(Math.random() * properties.length)];

                const expectedStatus = 400;
                const expectedErrorMssg = `${randomProp} should not be null or undefined`;

                // Delete the property
                const user = testKit.userDataGenerator.fullUser() as any;
                delete user[randomProp];

                // Create
                const response = await request(testKit.server)
                    .post(testKit.endpoints.register)
                    .send(user);

                expect(response.body).toStrictEqual({ error: expectedErrorMssg });
                expect(response.statusCode).toBe(expectedStatus);
            });
        });
    });

    describe('Database Operations', () => {
        test.concurrent('create user with correct data in db', async () => {
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
            await expect(testKit.hashingService.compare(user.password, userInDb!.password))
                .resolves.toBeTruthy();

            // Verify unmodified values
            expect(userInDb!.email).toBe(user.email);

            // Verify default values
            expect(userInDb!.role).toBe('readonly');
            expect(userInDb!.emailValidated).toBe(false);
            expect(userInDb!.createdAt).toBeDefined();
            expect(userInDb!.updatedAt).toBeDefined();
        });

        describe('Duplicated Property Error Handling Wiring', () => {
            test.concurrent('return 409 CONFLICT when user email already exists', async () => {
                const expectedStatus = 409;

                // Create user
                const user1 = await testKit.userModel.create(testKit.userDataGenerator.fullUser());

                // Create another user with same email
                const response = await request(testKit.server)
                    .post(testKit.endpoints.register)
                    .send({
                        ...testKit.userDataGenerator.fullUser(),
                        email: user1.email
                    });

                expect(response.body).toStrictEqual({ error: `User with email "${user1.email}" already exists` });
                expect(response.statusCode).toBe(expectedStatus);
            });
        });
    });

    describe('Response', () => {
        test.concurrent('return 201 CREATED and correct data (same data, no password, etc)', async () => {
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
                token: expect.any(String)
            });
            expect(response.statusCode).toBe(expectedStatus);
        });
    });
});