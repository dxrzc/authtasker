import request from 'supertest';
import { testKit } from '@integration/utils/testKit.util';
import { createUser } from '@integration/utils/createUser.util';
import { createTask } from '@integration/utils/createTask.util';
import { makeTasksCacheKey } from '@logic/cache/make-tasks-cache-key';

describe('GET /api/tasks/:id', () => {
    describe('Caching', () => {
        describe('Provided id is not a valid mongo id', () => {
            test('service does not try to find the task in redis cache database', async () => {
                const { sessionToken } = await createUser('editor');
                const invalidTaskId = 'bad-task-id';
                const redisServiceGetSpy = jest.spyOn(testKit.redisService, 'get');
                const response = await request(testKit.server)
                    .get(`${testKit.endpoints.tasksAPI}/${invalidTaskId}`)
                    .set('Authorization', `Bearer ${sessionToken}`);

                expect(redisServiceGetSpy).not.toHaveBeenCalledWith(makeTasksCacheKey(invalidTaskId));
            });
        });

        describe('"Cache-Control: no-store" is provided in request', () => {
            test('do not store the task in redis cache database', async () => {
                const { sessionToken } = await createUser('editor');
                const { taskId } = await createTask(sessionToken);
                const response = await request(testKit.server)
                    .get(`${testKit.endpoints.tasksAPI}/${taskId}`)
                    .set('Cache-Control', 'no-store')
                    .set('Authorization', `Bearer ${sessionToken}`);

                const taskInCache = await testKit.redisService.get(makeTasksCacheKey(taskId));
                expect(taskInCache).toBeNull();
            });
        }); 

        describe('No Cache-Control header is provided', () => {
            test('cache the response in redis cache database', async () => {
                const { sessionToken } = await createUser('editor');
                const { taskId } = await createTask(sessionToken);
                const response = await request(testKit.server)
                    .get(`${testKit.endpoints.tasksAPI}/${taskId}`)
                    .set('Authorization', `Bearer ${sessionToken}`);

                const taskInCache = await testKit.redisService.get(makeTasksCacheKey(taskId));
                expect(taskInCache).toBeDefined();
            });
        });
    });

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