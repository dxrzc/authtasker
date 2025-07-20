import request from 'supertest';
import { Types } from 'mongoose';
import { testKit } from '@integration/utils/testKit.util';
import { status2xx } from '@integration/utils/status2xx.util';
import { createUser } from '@integration/utils/createUser.util';
import { getRandomRole } from '@integration/utils/get-random-role.util';
import { usersApiErrors } from '@root/common/errors/messages/users-api.error.messages';
import { paginationErrors } from '@root/common/errors/messages/pagination.error.messages';
import { createUserMultipleTasks } from '@integration/utils/create-user-multiple-tasks-util';
import { makeTasksByUserPaginationCacheKey } from '@logic/cache/make-tasks-by-users-pag-cache-key';

describe('GET /api/tasks/allByUser/:id', () => {
    describe('Caching', () => {
        describe('"Cache-Control: no-store" header provided in request', () => {
            test('do not store the data in redis database', async () => {
                const page = 2;
                const limit = 1;
                // seed
                const { sessionToken, userId } = await createUser('editor');
                await createUserMultipleTasks(sessionToken, 7);
                // get all 
                await request(testKit.server)
                    .get(`${testKit.endpoints.findAllTasksByUser}/${userId}`)
                    .query({ page, limit })
                    .set('Cache-Control', 'no-store')
                    .set('Authorization', `Bearer ${sessionToken}`)
                    .expect(status2xx);
                // check data not in redis
                const key = makeTasksByUserPaginationCacheKey(userId, page, limit)
                const dataInRedis = await testKit.redisService.get(key);
                expect(dataInRedis).toBeNull();
            });
        });

        describe('No cache header provided', () => {
            test('cache the response in redis database', async () => {
                const page = 2;
                const limit = 1;
                // seed
                const { sessionToken, userId } = await createUser('editor');
                await createUserMultipleTasks(sessionToken, 5);
                // get all 
                await request(testKit.server)
                    .get(`${testKit.endpoints.findAllTasksByUser}/${userId}`)
                    .query({ page, limit })
                    .set('Authorization', `Bearer ${sessionToken}`)
                    .expect(status2xx);
                // check data in redis
                const key = makeTasksByUserPaginationCacheKey(userId, page, limit);
                const dataInRedis = await testKit.redisService.get(key);
                expect(dataInRedis).not.toBeNull();
            });
        });

        describe('Pagination in cache', () => {
            test('return data in cache', async () => {
                const page = 1;
                const limit = 2;
                // seed in order to send a validate page and limit
                const { sessionToken, userId } = await createUser('editor');
                await createUserMultipleTasks(sessionToken, 4);
                // mock data in cache
                const fakeData = 'fake data';
                const key = makeTasksByUserPaginationCacheKey(userId, page, limit);
                await testKit.redisService.set(key, fakeData);
                // get all
                const response = await request(testKit.server)
                    .get(`${testKit.endpoints.findAllTasksByUser}/${userId}`)
                    .query({ page, limit })
                    .set('Authorization', `Bearer ${sessionToken}`)
                    .expect(status2xx);
                // check data in response
                expect(response.body).toStrictEqual(fakeData);
            });
        });
    });

    describe('User not found', () => {
        test('return status 404 NOT FOUND', async () => {
            const { sessionToken } = await createUser(getRandomRole());
            const expectedStatus = 404;
            const expectedErrorMssg = usersApiErrors.USER_NOT_FOUND;

            const mongoId = new Types.ObjectId();
            const response = await request(testKit.server)
                .get(`${testKit.endpoints.findAllTasksByUser}/${mongoId}`)
                .set('Authorization', `Bearer ${sessionToken}`);

            expect(response.statusCode).toBe(expectedStatus);
            expect(response.body).toStrictEqual({ error: expectedErrorMssg });
        });
    });

    describe('Invalid mongo id', () => {
        test('return status 404 NOT FOUND', async () => {
            const { sessionToken } = await createUser(getRandomRole());
            const expectedStatus = 404;
            const expectedErrorMssg = usersApiErrors.USER_NOT_FOUND;

            const invalidId = 'invalid-id';
            const response = await request(testKit.server)
                .get(`${testKit.endpoints.findAllTasksByUser}/${invalidId}`)
                .set('Authorization', `Bearer ${sessionToken}`);

            expect(response.statusCode).toBe(expectedStatus);
            expect(response.body).toStrictEqual({ error: expectedErrorMssg });
        });
    });

    describe('Pagination Rules Wiring', () => {
        test('return status 400 BAD REQUEST when page exceeds the max possible page for the documents count', async () => {
            const expectedStatus = 400;
            const expectedErrorMssg = paginationErrors.PAGE_TOO_LARGE;

            const { sessionToken } = await createUser('editor');
            await createUserMultipleTasks(sessionToken, 7);

            const limit = 3;
            const invalidPage = 5;

            const response = await request(testKit.server)
                .get(testKit.endpoints.usersAPI)
                .query({ page: invalidPage, limit })
                .set('Authorization', `Bearer ${sessionToken}`);

            expect(response.statusCode).toBe(expectedStatus);
            expect(response.body).toStrictEqual({ error: expectedErrorMssg });
        });
    });

    describe('Response', () => {
        test('return status 200 and correct data length', async () => {
            const expectedStatus = 200;
            const { sessionToken, userId } = await createUser('editor');
            await createUserMultipleTasks(sessionToken, 3);
            // find all
            const limit = 2;
            const response = await request(testKit.server)
                .get(`${testKit.endpoints.findAllTasksByUser}/${userId}`)
                .query({ page: 1, limit })
                .set('Authorization', `Bearer ${sessionToken}`)
            expect(response.body.length).toBe(limit);
            expect(response.statusCode).toBe(expectedStatus);
        });
    });
});