import request from 'supertest';
import { faker } from '@faker-js/faker/.';
import { status2xx, testKit } from '@integration/utils';

describe('POST /api/users/register', () => {
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
    });

    describe('Response - Success', () => {
        test.concurrent('return safe and correct data in response (201 CREATED)', async () => {
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

    describe('Response - Failure', () => {
        test.concurrent.each(['name', 'email'])
            ('return 409 CONFLICT when user %s already exists', async (property: string) => {
                // Create original user
                const originalUser = await testKit.userModel.create(testKit.userDataGenerator.fullUser()) as any;
                const originalUserDuplicatedPropertyValue = originalUser[property];

                const expectedStatus = 409;
                const expectedErrorMssg = `User with ${property} "${originalUserDuplicatedPropertyValue}" already exists`;

                // Create user with the same property value
                const response = await request(testKit.server)
                    .post(testKit.endpoints.register)
                    .send({
                        ...testKit.userDataGenerator.fullUser(),
                        [property]: originalUserDuplicatedPropertyValue
                    });

                expect(response.body).toStrictEqual({ error: expectedErrorMssg })
                expect(response.statusCode).toBe(expectedStatus);
            });

        test.concurrent.each(['name', 'email', 'password'])
            ('return 400 BAD REQUEST when %s is missing', async (property: string) => {
                const expectedStatus = 400;
                const expectedErrorMssg = `${property} should not be null or undefined`

                // Delete the property
                const user = testKit.userDataGenerator.fullUser() as any;
                delete user[property];

                // Create
                const response = await request(testKit.server)
                    .post(testKit.endpoints.register)
                    .send(user);

                expect(response.body).toStrictEqual({ error: expectedErrorMssg });
                expect(response.statusCode).toBe(expectedStatus);
            });

        test.concurrent('return 400 BAD REQUEST when an unexpected property is provided', async () => {
            const expectedStatus = 400;
            const unexpectedPropertyName = faker.food.vegetable()
            const expectedErrorMssg = `property ${unexpectedPropertyName} should not exist`;

            const response = await request(testKit.server)
                .post(testKit.endpoints.register)
                .send({
                    ...testKit.userDataGenerator.fullUser(),
                    [unexpectedPropertyName]: faker.food.fruit(),
                });

            expect(response.body).toStrictEqual({ error: expectedErrorMssg });
            expect(response.statusCode).toBe(expectedStatus);
        });
    });
});

