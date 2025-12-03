import { testKit } from '@integration/kit/test.kit';
import { createTask } from '@integration/utils/create-task.util';
import { createUser } from '@integration/utils/create-user.util';
import { status2xx } from '@integration/utils/status-2xx.util';
import { getRandomRole } from '@test/tools/utilities/get-random-role.util';
import { Types } from 'mongoose';
import { makeTasksCacheKey } from 'src/functions/cache/make-tasks-cache-key';
import { DataInCache } from 'src/interfaces/cache/data-in-cache.interface';
import { ITasks } from 'src/interfaces/tasks/task.interface';
import { authErrors } from 'src/messages/auth.error.messages';
import { tasksApiErrors } from 'src/messages/tasks-api.error.messages';

describe(`GET ${testKit.urls.tasksAPI}/:id`, () => {
    describe('Session token not provided', () => {
        test('return 401 status code and invalid token error message', async () => {
            const response = await testKit.agent.get(`${testKit.urls.tasksAPI}/some-id`);
            expect(response.body).toStrictEqual({ error: authErrors.INVALID_TOKEN });
            expect(response.statusCode).toBe(401);
        });
    });

    describe('Task not found', () => {
        test('return 404 status code and task not found error message', async () => {
            const { sessionToken } = await createUser(getRandomRole());
            const response = await testKit.agent
                .get(`${testKit.urls.tasksAPI}/${new Types.ObjectId().toString()}`)
                .set('Authorization', `Bearer ${sessionToken}`);
            expect(response.body).toStrictEqual({ error: tasksApiErrors.NOT_FOUND });
            expect(response.statusCode).toBe(404);
        });
    });

    describe('Invalid uuid', () => {
        test('return 404 status code and task not found error message', async () => {
            const { sessionToken } = await createUser(getRandomRole());
            const response = await testKit.agent
                .get(`${testKit.urls.tasksAPI}/invalid-uuid`)
                .set('Authorization', `Bearer ${sessionToken}`);
            expect(response.body).toStrictEqual({ error: tasksApiErrors.NOT_FOUND });
            expect(response.statusCode).toBe(404);
        });
    });

    describe('Task found', () => {
        test('return 200 status code and task found', async () => {
            const { sessionToken, id } = await createUser(getRandomRole());
            const task = await createTask(id);
            const response = await testKit.agent
                .get(`${testKit.urls.tasksAPI}/${task.id}`)
                .set('Authorization', `Bearer ${sessionToken}`);
            expect(response.body).toStrictEqual(task);
            expect(response.statusCode).toBe(200);
        });

        describe('Task not in cache', () => {
            test('store task in redis cache', async () => {
                const { sessionToken, id } = await createUser(getRandomRole());
                const task = await createTask(id);
                await testKit.agent
                    .get(`${testKit.urls.tasksAPI}/${task.id}`)
                    .set('Authorization', `Bearer ${sessionToken}`)
                    .expect(status2xx);
                const redisKey = makeTasksCacheKey(task.id);
                const cachedTask = await testKit.redisService.get<DataInCache<ITasks>>(redisKey);
                expect(cachedTask?.data).toStrictEqual(task);
            });

            test('store task in redis for hard ttls specified in configurations', async () => {
                const { sessionToken, id } = await createUser(getRandomRole());
                const task = await createTask(id);
                await testKit.agent
                    .get(`${testKit.urls.tasksAPI}/${task.id}`)
                    .set('Authorization', `Bearer ${sessionToken}`)
                    .expect(status2xx);
                const redisKey = makeTasksCacheKey(task.id);
                const ttlSeconds = await testKit.redisService.getTtl(redisKey);
                const expectedTtlSeconds = testKit.configService.CACHE_HARD_TTL_SECONDS;
                expect(ttlSeconds).toBeGreaterThanOrEqual(expectedTtlSeconds - 2);
                expect(ttlSeconds).toBeLessThanOrEqual(expectedTtlSeconds);
            });
        });

        describe('Task already in cache', () => {
            test('return task stored in cache', async () => {
                const { sessionToken, id } = await createUser(getRandomRole());
                const task = await createTask(id);
                // trigger cache
                await testKit.agent
                    .get(`${testKit.urls.tasksAPI}/${task.id}`)
                    .set('Authorization', `Bearer ${sessionToken}`)
                    .expect(status2xx);
                // change task name in cache
                const modifiedName = 'test task name';
                await testKit.tasksCacheService.cache({
                    ...(task as unknown as ITasks),
                    name: modifiedName,
                });
                // task returned should contain modified name
                const response = await testKit.agent
                    .get(`${testKit.urls.tasksAPI}/${task.id}`)
                    .set('Authorization', `Bearer ${sessionToken}`)
                    .expect(status2xx);
                expect(response.body).toStrictEqual({
                    ...task,
                    name: modifiedName,
                });
            });
        });
    });
});
