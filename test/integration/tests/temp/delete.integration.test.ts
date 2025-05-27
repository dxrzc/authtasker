import request from 'supertest';
import { Types } from 'mongoose';
import { createUser, status2xx, testKit } from '@integration/utils';

describe('DELETE /api/users/:id', () => {
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

    describe('Response - Failure', () => {
        test.concurrent('return 404 NOT FOUND when user is not found', async () => {
            const expectedStatus = 404;
            const validId = new Types.ObjectId();
            const expectedErrorMssg = `User with id ${validId} not found`;

            // Create user
            const { sessionToken } = await createUser('readonly');

            // Delete
            const response = await request(testKit.server)
                .delete(`${testKit.endpoints.usersAPI}/${validId}`)
                .set('Authorization', `Bearer ${sessionToken}`);

            expect(response.body).toStrictEqual({ error: expectedErrorMssg });
            expect(response.statusCode).toBe(expectedStatus);
        });

        test.concurrent('return 404 NOT FOUND even when id is not a valid mongo id', async () => {
            const invalidId = '12345';
            const expectedStatus = 404;
            const expectedErrorMssg = `User with id ${invalidId} not found`;

            // Create user
            const { sessionToken } = await createUser('readonly');

            // Delete
            const response = await request(testKit.server)
                .delete(`${testKit.endpoints.usersAPI}/${invalidId}`)
                .set('Authorization', `Bearer ${sessionToken}`);

            expect(response.body).toStrictEqual({ error: expectedErrorMssg });
            expect(response.statusCode).toBe(expectedStatus);
        });
    });
});