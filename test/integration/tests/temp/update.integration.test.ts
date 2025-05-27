import request from 'supertest';
import { Types } from 'mongoose';
import { testKit, status2xx, createUser } from '@integration/utils';

describe('PATCH /api/users/:id', () => {
    describe('Database Operations', () => {
        test('update properties in database', async () => {
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

        test('email change triggers account downgrade', async () => {
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

        test('dont downgrade the user if the new email is exactly the same', async () => {
            // Create an editor user
            const { sessionToken, userId, userEmail } = await createUser('editor');

            // Update the email using the same email
            await request(testKit.server)
                .patch(`${testKit.endpoints.usersAPI}/${userId}`)
                .set('Authorization', `Bearer ${sessionToken}`)
                .send({
                    email: userEmail
                })
                .expect(status2xx);

            const updatedUserInDb = await testKit.userModel.findById(userId);
            expect(updatedUserInDb!.emailValidated).toBeTruthy();
            expect(updatedUserInDb?.role).toBe('editor');
        });

        test('dont downgrade admin users when they update their email ', async () => {
            // Create an administrator user
            const { sessionToken, userId } = await createUser('admin');

            // Update
            await request(testKit.server)
                .patch(`${testKit.endpoints.usersAPI}/${userId}`)
                .set('Authorization', `Bearer ${sessionToken}`)
                .send({
                    email: testKit.userDataGenerator.email()
                })
                .expect(status2xx);

            const updatedUserInDb = await testKit.userModel.findById(userId);
            expect(updatedUserInDb?.role).toBe('admin');
            expect(updatedUserInDb!.emailValidated).toBeTruthy();
        });
    });

    describe('Response - Success ', () => {
        test('return safe and correct data (200 OK)', async () => {
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

    describe('Response - Failure', () => {
        test('return 404 NOT FOUND when user is not found', async () => {
            const validId = new Types.ObjectId();
            const expectedStatus = 404;
            const expectedErrorMssg = `User with id ${validId} not found`;

            // Create user
            const { sessionToken } = await createUser('readonly');

            // Update
            const response = await request(testKit.server)
                .patch(`${testKit.endpoints.usersAPI}/${validId}`)
                .set('Authorization', `Bearer ${sessionToken}`)
                .send({ name: testKit.userDataGenerator.name() });

            expect(response.body).toStrictEqual({ error: expectedErrorMssg });
            expect(response.statusCode).toBe(expectedStatus);
        });

        test('return 404 NOT FOUND even when the id is not a valid mongo id', async () => {
            const expectedStatus = 404;
            const invalidId = '12345';
            const expectedErrorMssg = `User with id ${invalidId} not found`;

            // Create user
            const { sessionToken } = await createUser('readonly');

            // Update
            const response = await request(testKit.server)
                .patch(`${testKit.endpoints.usersAPI}/${invalidId}`)
                .set('Authorization', `Bearer ${sessionToken}`)
                .send({ name: testKit.userDataGenerator.name() });

            expect(response.body).toStrictEqual({ error: expectedErrorMssg });
            expect(response.statusCode).toBe(expectedStatus);
        });

        test('return 400 BAD REQUEST when no field to update is provided', async () => {
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

        test.each(['name', 'email'])
            ('return 409 CONFLICT when user %s already exists', async (property: string) => {                

                // Create the original user
                const originalUserInDb = await testKit.userModel.create(testKit.userDataGenerator.fullUser()) as any;
                const alreadyExistingPropertyValue = originalUserInDb[property];

                const expectedStatus = 409;
                const expectedErrorMssg = `User with ${property} "${alreadyExistingPropertyValue}" already exists`;

                // Create the user to update
                const { sessionToken: userToUpdateSessionToken, userId: userToUpdateId } = await createUser('readonly');

                // Update
                const response = await request(testKit.server)
                    .patch(`${testKit.endpoints.usersAPI}/${userToUpdateId}`)
                    .set('Authorization', `Bearer ${userToUpdateSessionToken}`)
                    .send({ [property]: alreadyExistingPropertyValue })

                expect(response.body).toStrictEqual({ error: expectedErrorMssg })
                expect(response.statusCode).toBe(expectedStatus);
            });
    });
});