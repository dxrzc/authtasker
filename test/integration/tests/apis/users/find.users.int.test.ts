import request from 'supertest';
import { Apis } from 'src/enums/apis.enum';
import { testKit } from '@integration/utils/testKit.util';
import { createUser } from '@integration/utils/createUser.util';
import { makePaginationCacheKey } from '@logic/cache/make-pagination-cache-key';
import { paginationErrors } from 'src/common/errors/messages/pagination.error.messages';

describe('GET /api/users/:id', () => {
    let sessionToken: string;

    beforeAll(async () => {
        sessionToken = (await createUser('admin')).sessionToken;
        const usersSeed = 29;
        await request(testKit.server)
            .post(`${testKit.endpoints.seedUsers}/${usersSeed}`);
    });

    describe('Caching', () => {
        describe('"Cache-Control: no-store" is provided in request ', () => {
            test('do not store the data in redis database', async () => {
                const page = 3;
                const limit = 2;
                const response = await request(testKit.server)
                    .get(testKit.endpoints.usersAPI)
                    .query({ page, limit })
                    .set('Cache-Control', 'no-store')
                    .set('Authorization', `Bearer ${sessionToken}`);
                const dataInRedis = await testKit.redisService.get(makePaginationCacheKey(Apis.users, page, limit));
                expect(dataInRedis).toBeNull();
            });
        });

        describe('No Cache-Control header is provided', () => {
            test('cache the response in redis database', async () => {
                const page = 2;
                const limit = 3;
                const response = await request(testKit.server)
                    .get(testKit.endpoints.usersAPI)
                    .query({ page, limit })
                    .set('Authorization', `Bearer ${sessionToken}`);
                const dataInRedis = await testKit.redisService.get(makePaginationCacheKey(Apis.users, page, limit));
                expect(dataInRedis).toBeDefined();
            });
        });

        describe('Pagination in cache', () => {
            test('return data in cache', async () => {
                const page = 2;
                const limit = 1;
                // mock data in cache
                const fakeData = 'fakeData';
                await testKit.redisService.set(makePaginationCacheKey(Apis.users, page, limit), fakeData);
                // find 
                const response = await request(testKit.server)
                    .get(testKit.endpoints.usersAPI)
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
            // calculate invalid page
            const documentsCount = await testKit.userModel.countDocuments();
            const limit = 10;
            const invalidPage = Math.ceil(documentsCount / limit) + 1;
            // find
            const response = await request(testKit.server)
                .get(testKit.endpoints.usersAPI)
                .query({ page: invalidPage, limit })
                .set('Authorization', `Bearer ${sessionToken}`);
            expect(response.statusCode).toBe(expectedStatus);
            expect(response.body).toStrictEqual({ error: expectedErrorMssg });
        });
    });
});