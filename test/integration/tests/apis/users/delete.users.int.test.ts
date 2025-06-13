import request from 'supertest';
import { testKit } from '@integration/utils/testKit.util';
import { status2xx } from '@integration/utils/status2xx.util';
import { createUser } from '@integration/utils/createUser.util';
import { authErrors } from '@root/common/errors/messages/auth.error.messages';

describe('DELETE /api/users/:id', () => {
    describe('Modification Access Rules Wiring', () => {
        test.concurrent('editors are forbiddenn to delete readonly users', async () => {
            const expectedStatus = 403;
            const expectedErrorMssg = authErrors.FORBIDDEN;

            // Create current user
            const { sessionToken: currentUserSessionToken } = await createUser('editor');

            // Create target user
            const { userId: targetUserId } = await createUser('readonly');

            // Attempt to delete the target user
            const response = await request(testKit.server)
                .delete(`${testKit.endpoints.usersAPI}/${targetUserId}`)
                .set('Authorization', `Bearer ${currentUserSessionToken}`);
                
            expect(response.statusCode).toBe(expectedStatus);
            expect(response.body).toStrictEqual({ error: expectedErrorMssg });            
        });

        test.concurrent('admins are authorized to delete readonly accounts', async () => {
            // Create current user
            const { sessionToken: currentUserSessionToken } = await createUser('admin');

            // Create target user
            const { userId: targetUserId } = await createUser('readonly');

            // Attempt to delete the target user
            await request(testKit.server)
                .delete(`${testKit.endpoints.usersAPI}/${targetUserId}`)
                .set('Authorization', `Bearer ${currentUserSessionToken}`)                
                .expect(status2xx);
        });
    });

    describe('Database Operations', () => {
        test.concurrent('user is deleted in database', async () => {
            // Create user
            const { sessionToken, userId } = await createUser('readonly');

            // Delete
            await request(testKit.server)
                .delete(`${testKit.endpoints.usersAPI}/${userId}`)
                .set('Authorization', `Bearer ${sessionToken}`)
                .expect(status2xx);

            await expect(testKit.userModel.findById(userId)).resolves.toBeNull();
        });

        test.concurrent('delete all tasks associated with the user', async () => {
            // Create editor
            const { sessionToken, userId } = await createUser('editor');

            // Create some tasks
            const { id: task1Id } = (
                await request(testKit.server)
                    .post(testKit.endpoints.createTask)
                    .send(testKit.tasksDataGenerator.fullTask())
                    .set('Authorization', `Bearer ${sessionToken}`)
                    .expect(status2xx)
            ).body;
            const { id: task2Id } = (
                await request(testKit.server)
                    .post(testKit.endpoints.createTask)
                    .send(testKit.tasksDataGenerator.fullTask())
                    .set('Authorization', `Bearer ${sessionToken}`)
                    .expect(status2xx)
            ).body;

            // Delete user
            await request(testKit.server)
                .delete(`${testKit.endpoints.usersAPI}/${userId}`)
                .set('Authorization', `Bearer ${sessionToken}`)
                .expect(status2xx);

            await expect(testKit.tasksModel.findById(task1Id)).resolves.toBeNull();
            await expect(testKit.tasksModel.findById(task2Id)).resolves.toBeNull();
        });
    });

    describe('Response', () => {
        test.concurrent('return 204 NO CONTENT', async () => {
            const expectedStatus = 204;

            // Create user
            const { sessionToken, userId } = await createUser('readonly');

            // Delete
            const response = await request(testKit.server)
                .delete(`${testKit.endpoints.usersAPI}/${userId}`)
                .set('Authorization', `Bearer ${sessionToken}`);

            expect(response.body).toStrictEqual({});
            expect(response.statusCode).toBe(expectedStatus);
        });
    });
});