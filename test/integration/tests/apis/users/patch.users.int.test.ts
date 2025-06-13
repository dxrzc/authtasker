import request from 'supertest';
import { testKit } from '@integration/utils/testKit.util';
import { status2xx } from '@integration/utils/status2xx.util';
import { createUser } from '@integration/utils/createUser.util';
import { commonErrors } from '@root/common/errors/messages/common.error.messages';
import { usersApiErrors } from '@root/common/errors/messages/users-api.error.messages';

describe('PATCH /api/users/:id', () => {
    describe('Input sanitization Wiring', () => {
        test.concurrent('return 400 BAD REQUEST when an unexpected property is provided', async () => {
            const expectedStatus = 400;
            const expectedErrorMssg = commonErrors.UNEXPECTED_PROPERTY_PROVIDED;

            const { sessionToken, userId } = await createUser('editor');
            const response = await request(testKit.server)
                .patch(`${testKit.endpoints.usersAPI}/${userId}`)
                .set('Authorization', `Bearer ${sessionToken}`)
                .send({ role: 'admin' });

            expect(response.body).toStrictEqual({ error: expectedErrorMssg });
            expect(response.statusCode).toBe(expectedStatus);
        });

        test.concurrent('return 400 BAD REQUEST when no field to update is provided', async () => {
            const expectedStatus = 400;
            const expectedErrorMssg = usersApiErrors.NO_PROPERTIES_TO_UPDATE;

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
        test.concurrent('email change triggers role downgrade to "readonly" and "emailValidated" to false', async () => {
            // Create an editor user
            const { sessionToken, userId } = await createUser('editor');

            // Update
            await request(testKit.server)
                .patch(`${testKit.endpoints.usersAPI}/${userId}`)
                .set('Authorization', `Bearer ${sessionToken}`)
                .send({ email: testKit.userDataGenerator.email() })
                .expect(status2xx);

            const updatedUserInDb = await testKit.userModel.findById(userId);
            expect(updatedUserInDb!.emailValidated).toBeFalsy();
            expect(updatedUserInDb?.role).toBe('readonly');
        });

        test.concurrent('admin email change does not downgrade role or modifies "emailValidated" property', async () => {
            // Create an editor user
            const { sessionToken, userId } = await createUser('admin');

            // Update
            await request(testKit.server)
                .patch(`${testKit.endpoints.usersAPI}/${userId}`)
                .set('Authorization', `Bearer ${sessionToken}`)
                .send({ email: testKit.userDataGenerator.email() })
                .expect(status2xx);

            const updatedUserInDb = await testKit.userModel.findById(userId);
            expect(updatedUserInDb!.emailValidated).toBeTruthy();
            expect(updatedUserInDb?.role).toBe('admin');
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
            expect(updatedUserInDb!.name).toBe(update.name.toLowerCase().trim());
            await expect(testKit.hashingService.compare(update.password, updatedUserInDb!.password))
                .resolves.toBeTruthy();

            // Verify unmodified values
            expect(updatedUserInDb!.email).toBe(update.email);
        });

        test.concurrent('return 409 CONFLICT when user name already exists', async () => {
            const expectedStatus = 409;
            const expectedErrorMssg = usersApiErrors.USER_ALREADY_EXISTS;

            // Create user
            const user1 = await testKit.userModel.create(testKit.userDataGenerator.fullUser());

            // Create another user with same name
            const response = await request(testKit.server)
                .post(testKit.endpoints.register)
                .send({
                    ...testKit.userDataGenerator.fullUser(),
                    name: user1.name
                });

            expect(response.body).toStrictEqual({ error: expectedErrorMssg });
            expect(response.statusCode).toBe(expectedStatus);
        });

        test.concurrent('return 409 CONFLICT when user email already exists', async () => {
            const expectedStatus = 409;
            const expectedErrorMssg = usersApiErrors.USER_ALREADY_EXISTS;

            // Create user
            const user1 = await testKit.userModel.create(testKit.userDataGenerator.fullUser());

            // Create another user with same email
            const response = await request(testKit.server)
                .post(testKit.endpoints.register)
                .send({
                    ...testKit.userDataGenerator.fullUser(),
                    email: user1.email
                });

            expect(response.body).toStrictEqual({ error: expectedErrorMssg });
            expect(response.statusCode).toBe(expectedStatus);
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