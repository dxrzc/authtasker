import request from 'supertest';
import { createUser, testKit } from '@integration/utils';
import { createTask } from '@integration/utils/createTask.util';

describe('GET /api/tasks/:id', () => {
    describe('Response', () => {
        test.concurrent('return status 200 OK and correct data', async () => {
            const expectedStatus = 200;
            const { sessionToken } = await createUser('editor');
            const { taskId } = await createTask(sessionToken);

            const response = await request(testKit.server)
                .get(`${testKit.endpoints.tasksAPI}/${taskId}`)
                .set('Authorization', `Bearer ${sessionToken}`);

            const taskInDb = await testKit.tasksModel.findById(taskId);
            expect(response.body).toStrictEqual({
                name: taskInDb!.name,
                description: taskInDb!.description,
                status: taskInDb!.status,
                priority: taskInDb!.priority,
                user: taskInDb!.user.toString(),
                createdAt: taskInDb!.createdAt.toISOString(),
                updatedAt: taskInDb!.updatedAt.toISOString(),
                id: taskInDb!.id,
            });
            expect(response.statusCode).toBe(expectedStatus);
        });
    });
});