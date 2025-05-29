import request from 'supertest';
import { createUser, status2xx, testKit } from '@integration/utils';

describe('DELETE /api/users/:id', () => {
    describe('Modification Access Logic Wiring', () => {
        test.concurrent('return status 403 FORBIDDEN when editor tries to delete another editor', async () => {
            const expectedStatus = 403;

            // Create current user
            const { sessionToken: currentUserSessionToken } = await createUser('editor');

            // Create target user
            const { userId: targetUserId } = await createUser('editor');

            // Attempt to delete the target user
            await request(testKit.server)
                .delete(`${testKit.endpoints.usersAPI}/${targetUserId}`)
                .set('Authorization', `Bearer ${currentUserSessionToken}`)
                .expect(expectedStatus);
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

    describe('Response - Success', () => {
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