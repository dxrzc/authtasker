import request from 'supertest';
import { testKit, status2xx, createUser } from '@integration/utils';
import { USER_CONSTANTS } from '@root/rules/constants';

describe('PATCH /api/users/:id', () => {
    describe('Input sanitization', () => {
        describe('Validation Rules Wiring', () => {
            test.concurrent('return 400 BAD REQUEST when user name is too short', async () => {
                const expectedStatus = 400;
                const expectedErrorMssg = `name must be longer than or equal to ${USER_CONSTANTS.MIN_NAME_LENGTH} characters`;

                // Create user
                const { sessionToken, userId } = await createUser('editor');

                const invalidName = 'a';

                const response = await request(testKit.server)
                    .patch(`${testKit.endpoints.usersAPI}/${userId}`)
                    .set('Authorization', `Bearer ${sessionToken}`)
                    .send({ name: invalidName });

                expect(response.body).toStrictEqual({ error: expectedErrorMssg });
                expect(response.statusCode).toBe(expectedStatus);
            });
        });

        test.concurrent('return 400 BAD REQUEST when no field to update is provided', async () => {
            const expectedStatus = 400;
            const expectedErrorMssg = 'At least one field is required to update the user';

            // Create user
            const { sessionToken, userId } = await createUser('readonly');

            // Update
            const response = await request(testKit.server)
                .patch(`${testKit.endpoints.usersAPI}/${userId}`)
                .set('Authorization', `Bearer ${sessionToken}`)
                .send();

            expect(response.statusCode).toBe(expectedStatus);
            expect(response.body).toStrictEqual({ error: expectedErrorMssg });
        });
    });

    describe('Modification Access Rules Wiring', () => {
        test.concurrent('editors are forbidden to update other editors', async () => {
            const expectedStatus = 403;

            // Create current user
            const { sessionToken: currentUserSessionToken } = await createUser('editor');

            // Create target user
            const { userId: targetUserId } = await createUser('editor');

            // Attempt to update the target user
            await request(testKit.server)
                .patch(`${testKit.endpoints.usersAPI}/${targetUserId}`)
                .set('Authorization', `Bearer ${currentUserSessionToken}`)
                .send({ name: testKit.userDataGenerator.name(), })
                .expect(expectedStatus);
        });

        test.concurrent('admins are authorized to update editors', async () => {
            // Create current user
            const { sessionToken: currentUserSessionToken } = await createUser('admin');

            // Create target user
            const { userId: targetUserId } = await createUser('editor');

            // Attempt to update the target user
            await request(testKit.server)
                .patch(`${testKit.endpoints.usersAPI}/${targetUserId}`)
                .set('Authorization', `Bearer ${currentUserSessionToken}`)
                .send({ name: testKit.userDataGenerator.name(), })
                .expect(status2xx);
        });
    });

    describe('Database operations', () => {
        describe('Email Update Rules Wiring', () => {
            test.concurrent('email change triggers account role downgrade', async () => {
                // Create an editor user
                const { sessionToken, userId } = await createUser('editor');

                // Update
                await request(testKit.server)
                    .patch(`${testKit.endpoints.usersAPI}/${userId}`)
                    .set('Authorization', `Bearer ${sessionToken}`)
                    .send({
                        email: testKit.userDataGenerator.email()
                    })
                    .expect(status2xx);

                const updatedUserInDb = await testKit.userModel.findById(userId);
                expect(updatedUserInDb!.emailValidated).toBeFalsy();
                expect(updatedUserInDb?.role).toBe('readonly');
            });
        });

        test.concurrent('update properties in database', async () => {
            // Create user
            const { sessionToken, userId } = await createUser('readonly');

            // New user values
            const update = {
                name: testKit.userDataGenerator.name(),
                email: testKit.userDataGenerator.email(),
                password: testKit.userDataGenerator.password()
            };

            // Update
            await request(testKit.server)
                .patch(`${testKit.endpoints.usersAPI}/${userId}`)
                .set('Authorization', `Bearer ${sessionToken}`)
                .send(update)
                .expect(status2xx);

            // Verify db persistence
            const updatedUserInDb = await testKit.userModel.findById(userId);
            expect(updatedUserInDb).toBeDefined();

            // Verify transformations 
            expect(updatedUserInDb!.name).toBe(update.name.toLowerCase());
            await expect(testKit.hashingService.compare(update.password, updatedUserInDb!.password))
                .resolves.toBeTruthy();

            // Verify unmodified values
            expect(updatedUserInDb!.email).toBe(update.email);
        });

        describe('Duplicated Property Error Handling Wiring', () => {
            test.concurrent('return 409 conflict when user name already exists', async () => {
                const expectedStatus = 409;

                // Create user
                const user1 = await testKit.userModel.create(testKit.userDataGenerator.fullUser());

                // Create another user with same name
                const response = await request(testKit.server)
                    .post(testKit.endpoints.register)
                    .send({
                        ...testKit.userDataGenerator.fullUser(),
                        name: user1.name
                    });

                expect(response.body).toStrictEqual({ error: `User with name "${user1.name}" already exists` });
                expect(response.statusCode).toBe(expectedStatus);
            });
        });
    });

    describe('Response', () => {
        test.concurrent('return 200 OK and correct data (same data, no password, etc)', async () => {
            const expectedStatus = 200;

            // Create user
            const { sessionToken, userId } = await createUser('readonly');

            // Update
            const response = await request(testKit.server)
                .patch(`${testKit.endpoints.usersAPI}/${userId}`)
                .set('Authorization', `Bearer ${sessionToken}`)
                .send({
                    name: testKit.userDataGenerator.name(),
                    email: testKit.userDataGenerator.email(),
                    password: testKit.userDataGenerator.password()
                });

            const updatedUserInDb = await testKit.userModel.findById(userId);
            expect(response.body).toStrictEqual({
                name: updatedUserInDb!.name,
                email: updatedUserInDb!.email,
                role: updatedUserInDb!.role,
                emailValidated: updatedUserInDb!.emailValidated,
                createdAt: updatedUserInDb!.createdAt.toISOString(),
                updatedAt: updatedUserInDb!.updatedAt.toISOString(),
                id: updatedUserInDb!.id,
            });
            expect(response.statusCode).toBe(expectedStatus);
        });
    });
});