import request from 'supertest';
import { createUser, status2xx, testKit } from "@integration/utils";
import { createTask } from "@integration/utils/createTask.util";

describe('DELETE /api/tasks/:id', () => {
    describe('Modification Access Logic Wiring', () => {
        test.concurrent('return 403 FORBIDDEN when editor tries to delete another editor\'s task', async () => {
            const expectedStatus = 403;

            // Create current user
            const { sessionToken: currentUserSessionToken } = await createUser('editor');

            // Create target user and task
            const { sessionToken: targetUserSessionToken } = await createUser('editor');
            const { taskId } = await createTask(targetUserSessionToken);

            // Attempt to delete the target user task
            await request(testKit.server)
                .delete(`${testKit.endpoints.tasksAPI}/${taskId}`)
                .set('Authorization', `Bearer ${currentUserSessionToken}`)
                .expect(expectedStatus);
        });
    });   

    describe('Database operations', () => {
        test.concurrent('task is deleted in database', async () => {
            const { sessionToken } = await createUser('editor');
            const { taskId } = await createTask(sessionToken);

            // Delete task
            await request(testKit.server)
                .delete(`${testKit.endpoints.tasksAPI}/${taskId}`)
                .set('Authorization', `Bearer ${sessionToken}`)
                .expect(status2xx);

            const taskInDb = await testKit.tasksModel.findById(taskId);
            expect(taskInDb).toBeNull();
        });
    });

    describe('Response - Success', () => {
        test.concurrent('return 204 NO CONTENT', async () => {
            const expectedStatus = 204;

            const { sessionToken } = await createUser('editor');
            const { taskId } = await createTask(sessionToken);

            const response = await request(testKit.server)
                .delete(`${testKit.endpoints.tasksAPI}/${taskId}`)
                .set('Authorization', `Bearer ${sessionToken}`);

            expect(response.body).toStrictEqual({});
            expect(response.statusCode).toBe(expectedStatus);
        });
    });
});