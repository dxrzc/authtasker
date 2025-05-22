import request from 'supertest';
import { Types } from 'mongoose';
import { testKit, status2xx } from '@integration/utils';
import { validRoles } from '@root/types/user';

describe('PATCH api/users/:id', () => {
    describe('Database', () => {
        test('update properties in database', async () => {
            // Create user
            const userCreated = await request(testKit.server)
                .post(testKit.endpoints.register)
                .send(testKit.userDataGenerator.fullUser());
            const sessionToken = userCreated.body.token;
            const userId: string = userCreated.body.user.id;

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

        test('update emailValidated to false and role to readonly if the new email is different', async () => {
            // Create user
            const userCreated = await request(testKit.server)
                .post(testKit.endpoints.register)
                .send(testKit.userDataGenerator.fullUser());
            const sessionToken = userCreated.body.token;
            const userId: string = userCreated.body.user.id;

            // Change emailValidated and role artificially
            await testKit.userModel.findByIdAndUpdate(userId, { emailValidated: true, role: 'editor' });

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

        test('keep emailValidated status and role if new email is exactly the same', async () => {
            // Create user 
            const userCreated = await request(testKit.server)
                .post(testKit.endpoints.register)
                .send(testKit.userDataGenerator.fullUser());
            const sessionToken = userCreated.body.token;
            const userId: string = userCreated.body.user.id;

            // Change emailValidated and role artificially
            await testKit.userModel.findByIdAndUpdate(userId, { emailValidated: true, role: 'editor' });
            const previousUserEmail = userCreated.body.user.email;

            // Update
            await request(testKit.server)
                .patch(`${testKit.endpoints.usersAPI}/${userId}`)
                .set('Authorization', `Bearer ${sessionToken}`)
                .send({ email: previousUserEmail })
                .expect(status2xx);

            const updatedUserInDb = await testKit.userModel.findById(userId);
            expect(updatedUserInDb!.emailValidated).toBeTruthy();
            expect(updatedUserInDb!.role).toBe('editor');
        });
    });

    describe('Request', () => {
        test('return 401 UNAUTHORIZED when token is not provided', async () => {
            const expectedStatus = 401;
            const testID = new Types.ObjectId();

            const response = await request(testKit.server)
                .patch(`${testKit.endpoints.usersAPI}/${testID}`)
                .send({});

            expect(response.body).toStrictEqual({ error: 'No token provided' });
            expect(response.status).toBe(expectedStatus);
        });

        test('return 400 BAD REQUEST when no field to update is provided', async () => {
            const expectedStatus = 400;

            // Create user
            const createdUser = await request(testKit.server)
                .post(testKit.endpoints.register)
                .send(testKit.userDataGenerator.fullUser());
            const sessionToken = createdUser.body.token;
            const userId = createdUser.body.user.id;

            // Update
            const response = await request(testKit.server)
                .patch(`${testKit.endpoints.usersAPI}/${userId}`)
                .set('Authorization', `Bearer ${sessionToken}`)
                .send();
                
            expect(response.statusCode).toBe(expectedStatus);
            expect(response.body).toStrictEqual({ error: 'At least one field is required to update the user' });
        });

        test.each(validRoles)
            ('%s users can update their account', async (role: string) => {
                // Create user
                const createdUser = await request(testKit.server)
                    .post(testKit.endpoints.register)
                    .send(testKit.userDataGenerator.fullUser());
                const sessionToken = createdUser.body.token;
                const userId = createdUser.body.user.id;

                // Change the user artificially
                await testKit.userModel.findByIdAndUpdate(userId, { role });

                // Update
                await request(testKit.server)
                    .patch(`${testKit.endpoints.usersAPI}/${userId}`)
                    .set('Authorization', `Bearer ${sessionToken}`)
                    .send({ name: testKit.userDataGenerator.name() })
                    .expect(status2xx);
            });

        describe('admin users', () => {
            test.each(['readonly', 'editor'])
                ('can update %s users', async (targetUserRole: string) => {
                    // Create administrator
                    const adminUser = await request(testKit.server)
                        .post(testKit.endpoints.register)
                        .send(testKit.userDataGenerator.fullUser());
                    const adminSessionToken: string = adminUser.body.token;
                    await testKit.userModel.findByIdAndUpdate(adminUser.body.user.id, { role: 'admin' });

                    // Create target user
                    const targetUserCreated = await request(testKit.server)
                        .post(testKit.endpoints.register)
                        .send(testKit.userDataGenerator.fullUser());
                    const targetUserId: string = targetUserCreated.body.user.id;
                    await testKit.userModel.findByIdAndUpdate(targetUserId, { role: targetUserRole });

                    // Update
                    await request(testKit.server)
                        .patch(`${testKit.endpoints.usersAPI}/${targetUserId}`)
                        .set('Authorization', `Bearer ${adminSessionToken}`)
                        .send({ name: testKit.userDataGenerator.name() })
                        .expect(status2xx);
                });

            test('return 403 FORBIDDEN when tries to update other admin users', async () => {
                const expectedStatus = 403;

                // Create administrator
                const adminUser = await request(testKit.server)
                    .post(testKit.endpoints.register)
                    .send(testKit.userDataGenerator.fullUser());
                await testKit.userModel.findByIdAndUpdate(adminUser.body.user.id, { role: 'admin' });
                const adminSessionToken: string = adminUser.body.token;

                // Create another administrator
                const anotherAdmin = await request(testKit.server)
                    .post(testKit.endpoints.register)
                    .send(testKit.userDataGenerator.fullUser());
                await testKit.userModel.findByIdAndUpdate(anotherAdmin.body.user.id, { role: 'admin' });
                const anotherAdminId = anotherAdmin.body.user.id;

                // Update
                const response = await request(testKit.server)
                    .patch(`${testKit.endpoints.usersAPI}/${anotherAdminId}`)
                    .set('Authorization', `Bearer ${adminSessionToken}`)
                    .send({ name: testKit.userDataGenerator.name() })                    

                expect(response.statusCode).toBe(expectedStatus);
                expect(response.body).toStrictEqual({ error: 'You do not have permissions to perform this action' });
            });
        });

        describe.each(['readonly', 'editor'])('%s users', (reqUserRole: string) => {
            test.each(validRoles)
                ('return 403 FORBIDDEN when tries to update other %s users', async (targetUserRole: string) => {
                    const expectedStatus = 403;

                    // Create request user and set role artificially
                    const reqUserCreated = await request(testKit.server)
                        .post(testKit.endpoints.register)
                        .send(testKit.userDataGenerator.fullUser());
                    const reqUserSessionToken: string = reqUserCreated.body.token;
                    await testKit.userModel.findByIdAndUpdate(reqUserCreated.body.user.id, { role: reqUserRole });

                    // Create target user and set role artificially
                    const targetUserCreated = await request(testKit.server)
                        .post(testKit.endpoints.register)
                        .send(testKit.userDataGenerator.fullUser());
                    const targetUserId: string = targetUserCreated.body.user.id;
                    await testKit.userModel.findByIdAndUpdate(targetUserId, { role: targetUserRole });

                    // Update
                    const response = await request(testKit.server)
                        .patch(`${testKit.endpoints.usersAPI}/${targetUserId}`)
                        .set('Authorization', `Bearer ${reqUserSessionToken}`)
                        .send({ name: testKit.userDataGenerator.name() });

                    expect(response.statusCode).toBe(expectedStatus);
                    expect(response.body).toStrictEqual({ error: 'You do not have permissions to perform this action' });
                });
        });

        test.each(['name', 'email'])
            ('return 409 CONFLICT when user %s already exists', async (property: string) => {
                const expectedStatus = 409;

                // Create the original user
                const originalUserInDb = await testKit.userModel.create(testKit.userDataGenerator.fullUser()) as any;
                const alreadyExistingPropertyValue = originalUserInDb[property];

                // Create the user to update
                const userToUpdate = await request(testKit.server)
                    .post(testKit.endpoints.register)
                    .send(testKit.userDataGenerator.fullUser());
                const userToUpdateSessionToken = userToUpdate.body.token;
                const userToUpdateId = userToUpdate.body.user.id;

                // Update
                const response = await request(testKit.server)
                    .patch(`${testKit.endpoints.usersAPI}/${userToUpdateId}`)
                    .set('Authorization', `Bearer ${userToUpdateSessionToken}`)
                    .send({ [property]: alreadyExistingPropertyValue })                    

                expect(response.body).toStrictEqual({ error: `User with ${property} "${alreadyExistingPropertyValue}" already exists` })
                expect(response.statusCode).toBe(expectedStatus);
            });
    });

    describe('Response', () => {
        test('return safe and correct data (200 OK)', async () => {
            const expectedStatus = 200;

            // Create user
            const userCreated = await request(testKit.server)
                .post(testKit.endpoints.register)
                .send(testKit.userDataGenerator.fullUser());
            const sessionToken = userCreated.body.token;
            const userId: string = userCreated.body.user.id;

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