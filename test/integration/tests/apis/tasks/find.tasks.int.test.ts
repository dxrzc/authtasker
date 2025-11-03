import request from 'supertest';
import { Apis } from 'src/enums/apis.enum';
import { testKit } from '@integration/utils/testKit.util';
import { createUser } from '@integration/utils/createUser.util';
import { createTask } from '@integration/utils/createTask.util';
import { paginationErrors } from 'src/common/errors/messages/pagination.error.messages';
import { makePaginationCacheKey } from 'src/common/logic/cache/make-pagination-cache-key';

describe('GET /api/tasks/', () => {
    let tasksIdSorted = new Array<string>();
    let sessionToken: string;

    beforeAll(async () => {
        sessionToken = (await createUser('readonly')).sessionToken;

        const { sessionToken: user1SessionToken } = await createUser('editor');
        const { sessionToken: user2SessionToken } = await createUser('admin');

        // Create 7 tasks for user1
        for (let i = 0; i < 7; i++) {
            const { taskId } = await createTask(user1SessionToken);
            tasksIdSorted.push(taskId);
        }

        // Create 7 tasks for user2
        for (let i = 0; i < 7; i++) {
            const { taskId } = await createTask(user2SessionToken);
            tasksIdSorted.push(taskId);
        }

        // One more for user1
        tasksIdSorted.push((await createTask(user1SessionToken)).taskId);
    });

    describe('Caching', () => {
        describe('"Cache-Control: no-store" is provided in request ', () => {
            test('do not store the data in redis database', async () => {
                const page = 3;
                const limit = 2;
                const response = await request(testKit.server)
                    .get(testKit.endpoints.tasksAPI)
                    .query({ page, limit })
                    .set('Cache-Control', 'no-store')
                    .set('Authorization', `Bearer ${sessionToken}`);
                const dataInRedis = await testKit.redisService.get(
                    makePaginationCacheKey(Apis.tasks, page, limit),
                );
                expect(dataInRedis).toBeNull();
            });
        });

        describe('No Cache-Control header is provided', () => {
            test('cache the response in redis database', async () => {
                const page = 2;
                const limit = 3;
                const response = await request(testKit.server)
                    .get(testKit.endpoints.tasksAPI)
                    .query({ page, limit })
                    .set('Authorization', `Bearer ${sessionToken}`);
                const dataInRedis = await testKit.redisService.get(
                    makePaginationCacheKey(Apis.tasks, page, limit),
                );
                expect(dataInRedis).not.toBeNull();
            });
        });

        describe('Pagination in cache', () => {
            test('return data in cache', async () => {
                const page = 2;
                const limit = 1;
                // mock data in cache
                const fakeData = 'fakeData';
                await testKit.redisService.set(
                    makePaginationCacheKey(Apis.tasks, page, limit),
                    fakeData,
                );
                // find
                const response = await request(testKit.server)
                    .get(testKit.endpoints.tasksAPI)
                    .query({ page, limit })
                    .set('Authorization', `Bearer ${sessionToken}`);
                expect(response.body).toStrictEqual(fakeData);
            });
        });
    });

    describe('Pagination Rules Wiring', () => {
        test('return status 400 BAD REQUEST when page exceeds the max possible page for the documents count', async () => {
            const expectedStatus = 400;
            const expectedErrorMssg = paginationErrors.PAGE_TOO_LARGE;
            const { sessionToken } = await createUser('readonly');

            const documentsCount = await testKit.tasksModel.countDocuments();
            const limit = 10;
            const invalidPage = Math.ceil(documentsCount / limit) + 1;

            const response = await request(testKit.server)
                .get(testKit.endpoints.tasksAPI)
                .query({ page: invalidPage, limit })
                .set('Authorization', `Bearer ${sessionToken}`);

            expect(response.statusCode).toBe(expectedStatus);
            expect(response.body).toStrictEqual({ error: expectedErrorMssg });
        });
    });

    describe('Response', () => {
        test('return 200 OK and the expected tasks with the expected and correct data', async () => {
            const expectedStatus = 200;

            const page = 4;
            const limit = 3;

            const response = await request(testKit.server)
                .get(testKit.endpoints.tasksAPI)
                .query({ page, limit })
                .set('Authorization', `Bearer ${sessionToken}`);

            expect(response.body).toBeInstanceOf(Array);
            expect(response.body.length).toBe(limit);

            // compare every task
            const initialIndex = limit * (page - 1);
            let currentIndexInBody = 0;
            for (let i = initialIndex; i < initialIndex + limit; i++) {
                const taskInDb = await testKit.tasksModel.findById(tasksIdSorted[i]);
                expect(taskInDb).not.toBeNull();

                const taskInBody = response.body[currentIndexInBody++];
                expect(taskInBody).toBeDefined();

                expect(taskInBody).toStrictEqual({
                    name: taskInDb!.name,
                    description: taskInDb!.description,
                    status: taskInDb!.status,
                    priority: taskInDb!.priority,
                    user: taskInDb!.user.toString(),
                    createdAt: taskInDb!.createdAt.toISOString(),
                    updatedAt: taskInDb!.updatedAt.toISOString(),
                    id: taskInDb!.id,
                });
            }
            expect(response.statusCode).toBe(expectedStatus);
        });
    });
});
