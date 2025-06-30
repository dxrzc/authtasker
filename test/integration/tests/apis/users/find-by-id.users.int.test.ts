import request from 'supertest';
import { testKit } from '@integration/utils/testKit.util';
import { createUser } from '@integration/utils/createUser.util';
import { UserResponse } from '@root/types/user/user-response.type';
import { makeUsersCacheKey } from '@logic/cache/make-users-cache-key';
import { getRandomRole } from '@integration/utils/get-random-role.util';
import { commonErrors } from '@root/common/errors/messages/common.error.messages';

describe('GET /api/users/:id', () => {
    describe('Caching', () => {
        describe('Provided id is not a valid mongo id', () => {
            test.concurrent('service does not try to find the user in redis cache database', async () => {
                const { sessionToken } = await createUser(getRandomRole());
                const invalidId = 'bad-id';

                const redisServiceGetSpy = jest.spyOn(testKit.redisService, 'get');
                const response = await request(testKit.server)
                    .get(`${testKit.endpoints.usersAPI}/${invalidId}`)
                    .set('Authorization', `Bearer ${sessionToken}`);

                expect(redisServiceGetSpy).not.toHaveBeenCalledWith(makeUsersCacheKey(invalidId));
            });
        });

        describe('"Cache-Control: no-store" is provided in request', () => {
            test.concurrent('do not store the user in redis cache database', async () => {
                const { userId, sessionToken } = await createUser(getRandomRole());
                const response = await request(testKit.server)
                    .get(`${testKit.endpoints.usersAPI}/${userId}`)
                    .set('Cache-Control', 'no-store')
                    .set('Authorization', `Bearer ${sessionToken}`);

                const userInCache = await testKit.redisService.get<UserResponse>(makeUsersCacheKey(userId));
                expect(userInCache).toBeNull();
            });
        });

        describe('Max API rate limit reached', () => {
            describe('User is found', () => {
                test.concurrent('return 429 TOO MANY REQUESTS and the configured error message', async () => {
                    const expectedStatus = 429;
                    const expectedErrorMssg = commonErrors.TOO_MANY_REQUESTS;
                    const maxRequests = testKit.configService.API_MAX_REQ_PER_MINUTE;
                    // create user to get a valid session token
                    const { userId, sessionToken } = await createUser(getRandomRole());
                    // send requests to the endpoint until the rate limit is reached
                    for (let i = 0; i < maxRequests; i++) {
                        await request(testKit.server)
                            .get(`${testKit.endpoints.usersAPI}/${userId}`)
                            .set('Authorization', `Bearer ${sessionToken}`);
                    }
                    // last request should fail with 429 status code
                    const response = await request(testKit.server)
                        .get(`${testKit.endpoints.usersAPI}/${userId}`)
                        .set('Authorization', `Bearer ${sessionToken}`);
                    expect(response.statusCode).toBe(expectedStatus);
                    expect(response.body).toStrictEqual({ error: expectedErrorMssg });
                });
            });

            describe('User is not found', () => {
                test.concurrent('return 429 TOO MANY REQUESTS and the configured error message (even when user is not found)', async () => {
                    const expectedStatus = 429;
                    const expectedErrorMssg = commonErrors.TOO_MANY_REQUESTS;
                    const maxRequests = testKit.configService.API_MAX_REQ_PER_MINUTE;
                    // create user to get a valid session token
                    const { sessionToken } = await createUser(getRandomRole());
                    // send requests to the endpoint until the rate limit is reached
                    for (let i = 0; i < maxRequests; i++) {
                        await request(testKit.server)
                            .get(`${testKit.endpoints.usersAPI}/non-existing-id`)
                            .set('Authorization', `Bearer ${sessionToken}`);
                    }
                    // last request should fail with 429 status code
                    const response = await request(testKit.server)
                        .get(`${testKit.endpoints.usersAPI}/non-existing-id`)
                        .set('Authorization', `Bearer ${sessionToken}`);
                    expect(response.statusCode).toBe(expectedStatus);
                    expect(response.body).toStrictEqual({ error: expectedErrorMssg });
                });
            });
        });

        describe('No Cache-Control header is provided', () => {
            test.concurrent('cache the response in redis cache database', async () => {
                const { userId, sessionToken } = await createUser(getRandomRole());
                const response = await request(testKit.server)
                    .get(`${testKit.endpoints.usersAPI}/${userId}`)
                    .set('Authorization', `Bearer ${sessionToken}`);

                const userInCache = await testKit.redisService.get<UserResponse>(makeUsersCacheKey(userId));
                expect(userInCache).toBeDefined();
            });
        });
    });

    describe('Response', () => {
        test.concurrent('return 200 OK and correct data (same data, no password, etc)', async () => {
            const expectedStatus = 200;

            const { userId, sessionToken } = await createUser(getRandomRole());

            const response = await request(testKit.server)
                .get(`${testKit.endpoints.usersAPI}/${userId}`)
                .set('Authorization', `Bearer ${sessionToken}`);

            const userInDb = await testKit.userModel.findById(userId);
            expect(response.statusCode).toBe(expectedStatus);
            expect(response.body).toStrictEqual({
                name: userInDb!.name,
                email: userInDb!.email,
                role: userInDb!.role,
                emailValidated: userInDb!.emailValidated,
                createdAt: userInDb!.createdAt.toISOString(),
                updatedAt: userInDb!.updatedAt.toISOString(),
                id: userInDb!.id,
            });
        });
    });
});