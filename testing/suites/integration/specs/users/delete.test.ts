import { testKit } from '@integration/kit/test.kit';
import { createUser } from '@integration/utils/create-user.util';
import { status2xx } from '@integration/utils/status-2xx.util';
import { getRandomRole } from '@test/tools/utilities/get-random-role.util';
import { UserRole } from 'src/enums/user-role.enum';
import { makeRefreshTokenIndexKey } from 'src/functions/token/make-refresh-token-index-key';
import { makeRefreshTokenKey } from 'src/functions/token/make-refresh-token-key';
import { authErrors } from 'src/messages/auth.error.messages';
import { usersApiErrors } from 'src/messages/users-api.error.messages';
import { RateLimiter } from 'src/enums/rate-limiter.enum';
import { rateLimiting } from 'src/constants/rate-limiting.constants';
import { commonErrors } from 'src/messages/common.error.messages';
import { faker } from '@faker-js/faker';
import { statusCodes } from 'src/constants/status-codes.constants';
import { Types } from 'mongoose';

describe(`DELETE ${testKit.urls.usersAPI}/:id`, () => {
    describe('Session token not provided', () => {
        test(`return 401 status code and invalid token error message`, async () => {
            const { id } = await createUser(UserRole.READONLY);
            const { statusCode, body } = await testKit.agent
                .delete(`${testKit.urls.usersAPI}/${id}`)
                .send();
            expect(body).toStrictEqual({ error: authErrors.INVALID_TOKEN });
            expect(statusCode).toBe(statusCodes.UNAUTHORIZED);
        });
    });

    describe('Successful deletion', () => {
        test('return status 204 and remove user from database', async () => {
            const { sessionToken, id } = await createUser(UserRole.READONLY);
            const { statusCode } = await testKit.agent
                .delete(`${testKit.urls.usersAPI}/${id}`)
                .set('Authorization', `Bearer ${sessionToken}`);
            expect(statusCode).toBe(statusCodes.NO_CONTENT);
            const userInDb = await testKit.models.user.findById(id);
            expect(userInDb).toBeNull();
        });

        test('revoke all refresh tokens from redis', async () => {
            const {
                refreshToken,
                id,
                email,
                unhashedPassword: password,
                sessionToken,
            } = await createUser(getRandomRole());
            const refresh1Jti = testKit.refreshJwt.verify(refreshToken)!.jti;
            // login to obtain an extra token
            const login = await testKit.agent
                .post(testKit.urls.login)
                .send({ email, password })
                .expect(status2xx);
            const refresh2Jti = testKit.refreshJwt.verify(login.body.refreshToken)!.jti;
            // delete user
            await testKit.agent
                .delete(`${testKit.urls.usersAPI}/${id}`)
                .set('Authorization', `Bearer ${sessionToken}`)
                .expect(statusCodes.NO_CONTENT);
            // tokens not in refresh tokens count set
            const setKey = makeRefreshTokenIndexKey(id);
            const token1InSet = await testKit.redisService.belongsToSet(setKey, refresh1Jti);
            const token2InSet = await testKit.redisService.belongsToSet(setKey, refresh2Jti);
            expect(token1InSet).toBeFalsy();
            expect(token2InSet).toBeFalsy();
            // tokens not in refresh-tokens database
            const token1Key = makeRefreshTokenKey(id, refresh1Jti);
            const token2Key = makeRefreshTokenKey(id, refresh2Jti);
            const token1InRedis = await testKit.redisService.get(token1Key);
            const token2InRedis = await testKit.redisService.get(token2Key);
            expect(token1InRedis).toBeNull();
            expect(token2InRedis).toBeNull();
        });

        test('remove all tasks associated with the user', async () => {
            const { sessionToken, id } = await createUser(UserRole.READONLY);
            // Create some tasks for the user
            const task1 = await testKit.models.task.create({
                ...testKit.taskData.task,
                user: id,
            });
            const task2 = await testKit.models.task.create({
                ...testKit.taskData.task,
                user: id,
            });
            // Delete user
            await testKit.agent
                .delete(`${testKit.urls.usersAPI}/${id}`)
                .set('Authorization', `Bearer ${sessionToken}`)
                .expect(statusCodes.NO_CONTENT);
            // Verify tasks are removed
            const task1InDb = await testKit.models.task.findById(task1._id);
            const task2InDb = await testKit.models.task.findById(task2._id);
            expect(task1InDb).toBeNull();
            expect(task2InDb).toBeNull();
        });
    });

    describe('User not found', () => {
        test(`return 404 status code and user not found error message`, async () => {
            const { sessionToken } = await createUser(UserRole.ADMIN);
            const nonExistentId = new Types.ObjectId().toString();
            const { statusCode, body } = await testKit.agent
                .delete(`${testKit.urls.usersAPI}/${nonExistentId}`)
                .set('Authorization', `Bearer ${sessionToken}`);
            expect(body).toStrictEqual({ error: usersApiErrors.NOT_FOUND });
            expect(statusCode).toBe(statusCodes.NOT_FOUND);
        });
    });

    describe('ADMIN attempts to delete another ADMIN', () => {
        test(`return 403 status code and forbidden error message`, async () => {
            const { sessionToken: currentUserSessionToken } = await createUser(UserRole.ADMIN);
            const { id: targetUserId } = await createUser(UserRole.ADMIN);
            const { statusCode, body } = await testKit.agent
                .delete(`${testKit.urls.usersAPI}/${targetUserId}`)
                .set('Authorization', `Bearer ${currentUserSessionToken}`);
            expect(body).toStrictEqual({ error: authErrors.FORBIDDEN });
            expect(statusCode).toBe(403);
        });
    });

    describe('ADMIN attempts to delete an EDITOR', () => {
        test('successfully deletes user', async () => {
            const { sessionToken: currentUserSessionToken } = await createUser(UserRole.ADMIN);
            const { id: targetUserId } = await createUser(UserRole.EDITOR);
            await testKit.agent
                .delete(`${testKit.urls.usersAPI}/${targetUserId}`)
                .set('Authorization', `Bearer ${currentUserSessionToken}`)
                .expect(status2xx);
        });
    });

    describe('ADMIN attempts to delete a READONLY', () => {
        test('successfully deletes user', async () => {
            const { sessionToken: currentUserSessionToken } = await createUser(UserRole.ADMIN);
            const { id: targetUserId } = await createUser(UserRole.READONLY);
            await testKit.agent
                .delete(`${testKit.urls.usersAPI}/${targetUserId}`)
                .set('Authorization', `Bearer ${currentUserSessionToken}`)
                .expect(status2xx);
        });
    });

    describe('EDITOR attempts to delete an ADMIN', () => {
        test(`return 403 status code and forbidden error message`, async () => {
            const { sessionToken: currentUserSessionToken } = await createUser(UserRole.EDITOR);
            const { id: targetUserId } = await createUser(UserRole.ADMIN);
            const { statusCode, body } = await testKit.agent
                .delete(`${testKit.urls.usersAPI}/${targetUserId}`)
                .set('Authorization', `Bearer ${currentUserSessionToken}`);
            expect(body).toStrictEqual({ error: authErrors.FORBIDDEN });
            expect(statusCode).toBe(403);
        });
    });

    describe('EDITOR attempts to delete another EDITOR', () => {
        test(`return 403 status code and forbidden error message`, async () => {
            const { sessionToken: currentUserSessionToken } = await createUser(UserRole.EDITOR);
            const { id: targetUserId } = await createUser(UserRole.EDITOR);
            const { statusCode, body } = await testKit.agent
                .delete(`${testKit.urls.usersAPI}/${targetUserId}`)
                .set('Authorization', `Bearer ${currentUserSessionToken}`);
            expect(body).toStrictEqual({ error: authErrors.FORBIDDEN });
            expect(statusCode).toBe(403);
        });
    });

    describe('EDITOR attempts to delete a READONLY', () => {
        test(`return 403 status code and forbidden error message`, async () => {
            const { sessionToken: currentUserSessionToken } = await createUser(UserRole.EDITOR);
            const { id: targetUserId } = await createUser(UserRole.READONLY);
            const { statusCode, body } = await testKit.agent
                .delete(`${testKit.urls.usersAPI}/${targetUserId}`)
                .set('Authorization', `Bearer ${currentUserSessionToken}`);
            expect(body).toStrictEqual({ error: authErrors.FORBIDDEN });
            expect(statusCode).toBe(403);
        });
    });

    describe('READONLY attempts to delete another READONLY', () => {
        test(`return 403 status code and forbidden error message`, async () => {
            const { sessionToken: currentUserSessionToken } = await createUser(UserRole.READONLY);
            const { id: targetUserId } = await createUser(UserRole.READONLY);
            const { statusCode, body } = await testKit.agent
                .delete(`${testKit.urls.usersAPI}/${targetUserId}`)
                .set('Authorization', `Bearer ${currentUserSessionToken}`);
            expect(body).toStrictEqual({ error: authErrors.FORBIDDEN });
            expect(statusCode).toBe(403);
        });
    });

    describe('Too many requests', () => {
        test('return 429 status code and too many requests error message', async () => {
            const ip = faker.internet.ip();
            const { sessionToken, id } = await createUser(UserRole.READONLY);
            for (let i = 0; i < rateLimiting[RateLimiter.relaxed].max; i++) {
                const tempUser = await createUser(UserRole.READONLY);
                await testKit.agent
                    .delete(`${testKit.urls.usersAPI}/${tempUser.id}`)
                    .set('Authorization', `Bearer ${tempUser.sessionToken}`)
                    .set('X-Forwarded-For', ip);
            }
            const response = await testKit.agent
                .delete(`${testKit.urls.usersAPI}/${id}`)
                .set('Authorization', `Bearer ${sessionToken}`)
                .set('X-Forwarded-For', ip);
            expect(response.body).toStrictEqual({ error: commonErrors.TOO_MANY_REQUESTS });
            expect(response.statusCode).toBe(statusCodes.TOO_MANY_REQUESTS);
        });
    });
});
