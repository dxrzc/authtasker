import request from 'supertest';
import { testKit } from '@integration/utils/testKit.util';
import { status2xx } from '@integration/utils/status2xx.util';
import { createUser } from '@integration/utils/createUser.util';
import { createTask } from '@integration/utils/createTask.util';
import { authErrors } from 'src/common/errors/messages/auth.error.messages';

describe('DELETE /api/tasks/:id', () => {
    describe('Modification Access Rules Wiring', () => {
        test.concurrent('editors are forbidden to delete another editor\'s task', async () => {
            const expectedStatus = 403;
            const expectedErrorMssg = authErrors.FORBIDDEN;

            // Create current user
            const { sessionToken: currentUserSessionToken } = await createUser('editor');

            // Create target user and task
            const { sessionToken: targetUserSessionToken } = await createUser('editor');
            const { taskId } = await createTask(targetUserSessionToken);

            // Attempt to delete the target user task
            const response = await request(testKit.server)
                .delete(`${testKit.endpoints.tasksAPI}/${taskId}`)
                .set('Authorization', `Bearer ${currentUserSessionToken}`);

            expect(response.statusCode).toBe(expectedStatus);
            expect(response.body).toStrictEqual({ error: expectedErrorMssg });
        });

        test.concurrent('admins are authorized to delete editor\'s tasks', async () => {
            // Create admin
            const { sessionToken: currentUserSessionToken } = await createUser('admin');

            // Create target user and task
            const { sessionToken: targetUserSessionToken } = await createUser('editor');
            const { taskId } = await createTask(targetUserSessionToken);

            // Attempt to delete the target user task
            await request(testKit.server)
                .delete(`${testKit.endpoints.tasksAPI}/${taskId}`)
                .set('Authorization', `Bearer ${currentUserSessionToken}`)
                .expect(status2xx);
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

    describe('Response', () => {
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