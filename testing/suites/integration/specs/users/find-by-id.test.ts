import { testKit } from '@integration/kit/test.kit';
import { createUser } from '@integration/utils/create-user.util';
import { disableSystemErrorLogsForThisTest } from '@integration/utils/disable-system-error-logs';
import { status2xx } from '@integration/utils/status-2xx.util';
import { Types } from 'mongoose';
import { UserRole } from 'src/enums/user-role.enum';
import { makeUsersCacheKey } from 'src/functions/cache/make-users-cache-key';
import { authErrors } from 'src/messages/auth.error.messages';
import { usersApiErrors } from 'src/messages/users-api.error.messages';

describe(`POST ${testKit.urls.usersAPI}/:id`, () => {
    describe('Session token not provided', () => {
        test('return 401 status code and token not provided error message', async () => {
            const response = await testKit.agent.get(`${testKit.urls.usersAPI}/100`);
            expect(response.statusCode).toBe(401);
            expect(response.body).toStrictEqual({ error: authErrors.INVALID_TOKEN });
        });
    });

    describe('User found successfully', () => {
        describe('User was not in cache', () => {
            test('save user in cache', async () => {
                const { id, sessionToken } = await createUser();
                const cacheRedisKey = makeUsersCacheKey(id);
                await expect(testKit.redisService.get(cacheRedisKey)).resolves.toBeNull();
                await testKit.agent
                    .get(`${testKit.urls.usersAPI}/${id}`)
                    .set('Authorization', `Bearer ${sessionToken}`)
                    .expect(status2xx);
                // verify user is now in cache
                await expect(testKit.redisService.get(cacheRedisKey)).resolves.not.toBeNull();
            });

            test('user password is not saved in cache', async () => {
                const { id, sessionToken } = await createUser();
                const cacheRedisKey = makeUsersCacheKey(id);
                await testKit.agent
                    .get(`${testKit.urls.usersAPI}/${id}`)
                    .set('Authorization', `Bearer ${sessionToken}`)
                    .expect(status2xx);
                const cachedUser = await testKit.redisService.get<{ data: any }>(cacheRedisKey);
                expect(cachedUser!.data.password).toBeUndefined();
            });

            test('user credentialsChangedAt is not saved in cache', async () => {
                const { id, sessionToken } = await createUser();
                const cacheRedisKey = makeUsersCacheKey(id);
                await testKit.agent
                    .get(`${testKit.urls.usersAPI}/${id}`)
                    .set('Authorization', `Bearer ${sessionToken}`)
                    .expect(status2xx);
                const cachedUser = await testKit.redisService.get<{ data: any }>(cacheRedisKey);
                expect(cachedUser!.data.credentialsChangedAt).toBeUndefined();
            });
        });

        describe('User was in cache', () => {
            test('return user in cache', async () => {
                const { id, sessionToken } = await createUser();
                const redisCacheKey = makeUsersCacheKey(id);
                // triggers cache save
                await testKit.agent
                    .get(`${testKit.urls.usersAPI}/${id}`)
                    .set('Authorization', `Bearer ${sessionToken}`)
                    .expect(status2xx);
                const response = await testKit.agent
                    .get(`${testKit.urls.usersAPI}/${id}`)
                    .set('Authorization', `Bearer ${sessionToken}`)
                    .expect(status2xx);
                const cachedUser = await testKit.redisService.get<{ data: any }>(redisCacheKey);
                expect(response.body).toStrictEqual(cachedUser!.data);
            });
        });

        test('return 200 status code', async () => {
            const { id, sessionToken } = await createUser();
            await testKit.agent
                .get(`${testKit.urls.usersAPI}/${id}`)
                .set('Authorization', `Bearer ${sessionToken}`)
                .expect(200);
        });

        test('return user in database with no password', async () => {
            const { id, sessionToken } = await createUser();
            const response = await testKit.agent
                .get(`${testKit.urls.usersAPI}/${id}`)
                .set('Authorization', `Bearer ${sessionToken}`)
                .expect(status2xx);
            const user = await testKit.models.user.findById(id).exec();
            expect(response.body).toStrictEqual({
                name: user!.name,
                email: user!.email,
                role: user!.role,
                emailValidated: user!.emailValidated,
                createdAt: user!.createdAt.toISOString(),
                updatedAt: user!.updatedAt.toISOString(),
                id: user!.id,
            });
        });
    });

    describe('User not found (valid id)', () => {
        test('return 404 status and user not found error message', async () => {
            const { sessionToken } = await createUser();
            const response = await testKit.agent
                .get(`${testKit.urls.usersAPI}/${new Types.ObjectId().toString()}`)
                .set('Authorization', `Bearer ${sessionToken}`);
            expect(response.body).toStrictEqual({ error: usersApiErrors.NOT_FOUND });
            expect(response.statusCode).toBe(404);
        });
    });

    describe('Id is not valid', () => {
        test('return 404 status and user not found error message', async () => {
            const { sessionToken } = await createUser();
            const response = await testKit.agent
                .get(`${testKit.urls.usersAPI}/invalid-id`)
                .set('Authorization', `Bearer ${sessionToken}`);
            expect(response.body).toStrictEqual({ error: usersApiErrors.NOT_FOUND });
            expect(response.statusCode).toBe(404);
        });
    });

    describe('Cache fails', () => {
        test('request is successful', async () => {
            disableSystemErrorLogsForThisTest();
            const { sessionToken, id } = await createUser(UserRole.READONLY);
            const redisGetMock = jest
                .spyOn(testKit.usersCacheService['redisService'], 'get')
                .mockRejectedValue(new Error());
            await testKit.agent
                .get(`${testKit.urls.usersAPI}/${id}`)
                .set('Authorization', `Bearer ${sessionToken}`)
                .expect(status2xx);
            expect(redisGetMock).toHaveBeenCalledTimes(1);
        });
    });
});
