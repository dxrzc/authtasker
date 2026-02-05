import { testKit } from '@integration/kit/test.kit';
import { createUser } from '@integration/utils/create-user.util';
import { status2xx } from '@integration/utils/status-2xx.util';
import { getRandomRole } from '@test/tools/utilities/get-random-role.util';
import { UserRole } from 'src/enums/user-role.enum';
import { makeRefreshTokenIndexKey } from 'src/functions/token/make-refresh-token-index-key';
import { makeRefreshTokenKey } from 'src/functions/token/make-refresh-token-key';
import { makeUsersCacheKey } from 'src/functions/cache/make-users-cache-key';
import { authErrors } from 'src/messages/auth.error.messages';
import { usersApiErrors } from 'src/messages/users-api.error.messages';
import { RateLimiter } from 'src/enums/rate-limiter.enum';
import { commonErrors } from 'src/messages/common.error.messages';
import { faker } from '@faker-js/faker';
import { statusCodes } from 'src/constants/status-codes.constants';
import { usersLimits } from 'src/constants/user.constants';
import { disableSystemErrorLogsForThisTest } from '@integration/utils/disable-system-error-logs';
import { CacheService } from 'src/services/cache.service';
import { RefreshTokenService } from 'src/services/refresh-token.service';
import { rateLimitingSettings } from 'src/settings/rate-limiting.settings';

describe(`PATCH ${testKit.urls.usersAPI}/:id`, () => {
    describe('Session token not provided', () => {
        test(`return 401 status code and invalid token error message`, async () => {
            const { id } = await createUser(UserRole.READONLY);
            const { statusCode, body } = await testKit.agent
                .patch(`${testKit.urls.usersAPI}/${id}`)
                .send({ name: testKit.userData.name });
            expect(body).toStrictEqual({ error: authErrors.INVALID_TOKEN });
            expect(statusCode).toBe(statusCodes.UNAUTHORIZED);
        });
    });

    describe('Several properties are updated', () => {
        test('return status 200 and the updated user data in db', async () => {
            const { sessionToken, id } = await createUser(UserRole.READONLY);
            const { body, statusCode } = await testKit.agent
                .patch(`${testKit.urls.usersAPI}/${id}`)
                .set('Authorization', `Bearer ${sessionToken}`)
                .send({
                    name: testKit.userData.name,
                    email: testKit.userData.email,
                    password: testKit.userData.password,
                });
            const user = await testKit.models.user.findById(id);
            expect(statusCode).toBe(200);
            expect(body).toStrictEqual({
                name: user!.name,
                email: user!.email,
                role: user!.role,
                emailValidated: user!.emailValidated,
                createdAt: user!.createdAt.toISOString(),
                updatedAt: user!.updatedAt.toISOString(),
                id: user!.id,
            });
        });

        test('reflect updated data in db', async () => {
            const { sessionToken, id } = await createUser(UserRole.READONLY);
            const newName = testKit.userData.name;
            const newEmail = testKit.userData.email;
            const newPassword = testKit.userData.password;
            await testKit.agent
                .patch(`${testKit.urls.usersAPI}/${id}`)
                .set('Authorization', `Bearer ${sessionToken}`)
                .send({
                    name: newName,
                    email: newEmail,
                    password: newPassword,
                })
                .expect(status2xx);
            const userInDb = await testKit.models.user.findById(id).exec();
            expect(userInDb).not.toBeNull();
            expect(userInDb?.name).toBe(newName.toLowerCase().trim());
            expect(userInDb?.email).toBe(newEmail);
            const isPasswordCorrectlyHashed = await testKit.hashingService.compare(
                newPassword,
                userInDb!.password,
            );
            expect(isPasswordCorrectlyHashed).toBe(true);
        });

        test('user is deleted from cache', async () => {
            const { sessionToken, id } = await createUser(UserRole.READONLY);
            // cache the user
            await testKit.agent
                .get(`${testKit.urls.usersAPI}/${id}`)
                .set('Authorization', `Bearer ${sessionToken}`)
                .expect(statusCodes.OK);
            const cacheKey = makeUsersCacheKey(id);
            const cachedUserBefore = await testKit.redisService.get(cacheKey);
            expect(cachedUserBefore).not.toBeNull();
            // update user
            await testKit.agent
                .patch(`${testKit.urls.usersAPI}/${id}`)
                .set('Authorization', `Bearer ${sessionToken}`)
                .send({
                    name: testKit.userData.name,
                    email: testKit.userData.email,
                    password: testKit.userData.password,
                })
                .expect(statusCodes.OK);
            // verify user is removed from cache
            const cachedUserAfter = await testKit.redisService.get(cacheKey);
            expect(cachedUserAfter).toBeNull();
        });
    });

    describe('Name is updated', () => {
        test('name is transformed to lowercase and trimmed in db', async () => {
            const { sessionToken, id } = await createUser(UserRole.READONLY);
            const rawName =
                faker.string.alpha(usersLimits.MIN_NAME_LENGTH + 2).toUpperCase() + '  ';
            const expectedName = rawName.toLowerCase().trim();
            await testKit.agent
                .patch(`${testKit.urls.usersAPI}/${id}`)
                .set('Authorization', `Bearer ${sessionToken}`)
                .send({ name: rawName })
                .expect(status2xx);
            const userInDb = await testKit.models.user.findById(id).exec();
            expect(userInDb).not.toBeNull();
            expect(userInDb?.name).toBe(expectedName);
        });

        test('user is deleted from cache', async () => {
            const { sessionToken, id } = await createUser(UserRole.READONLY);
            // cache the user
            await testKit.agent
                .get(`${testKit.urls.usersAPI}/${id}`)
                .set('Authorization', `Bearer ${sessionToken}`)
                .expect(statusCodes.OK);
            const cacheKey = makeUsersCacheKey(id);
            const cachedUserBefore = await testKit.redisService.get(cacheKey);
            expect(cachedUserBefore).not.toBeNull();
            // update user
            await testKit.agent
                .patch(`${testKit.urls.usersAPI}/${id}`)
                .set('Authorization', `Bearer ${sessionToken}`)
                .send({ name: testKit.userData.name })
                .expect(statusCodes.OK);
            // verify user is removed from cache
            const cachedUserAfter = await testKit.redisService.get(cacheKey);
            expect(cachedUserAfter).toBeNull();
        });
    });

    describe('Email is updated', () => {
        test('revoke all the session tokens from redis', async () => {
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
            // update
            await testKit.agent
                .patch(`${testKit.urls.usersAPI}/${id}`)
                .send({ email: testKit.userData.email })
                .set('Authorization', `Bearer ${sessionToken}`)
                .expect(status2xx);
            // tokens not in refresh tokens index list
            const listKey = makeRefreshTokenIndexKey(id);
            const token1InList = await testKit.redisService.belongsToList(listKey, refresh1Jti);
            const token2InList = await testKit.redisService.belongsToList(listKey, refresh2Jti);
            expect(token1InList).toBeFalsy();
            expect(token2InList).toBeFalsy();
            // tokens not in refresh-tokens database
            const token1Key = makeRefreshTokenKey(id, refresh1Jti);
            const token2Key = makeRefreshTokenKey(id, refresh2Jti);
            const token1InRedis = await testKit.redisService.get(token1Key);
            const token2InRedis = await testKit.redisService.get(token2Key);
            expect(token1InRedis).toBeNull();
            expect(token2InRedis).toBeNull();
        });

        test('update credentialsChangedAt property', async () => {
            const { sessionToken, id } = await createUser(getRandomRole());
            const userBefore = await testKit.models.user.findById(id);
            const credentialsChangedAtBefore = userBefore!.credentialsChangedAt;
            // wait 1 second to ensure the timestamp will be different
            await new Promise((resolve) => setTimeout(resolve, 1000));
            await testKit.agent
                .patch(`${testKit.urls.usersAPI}/${id}`)
                .send({ email: testKit.userData.email })
                .set('Authorization', `Bearer ${sessionToken}`)
                .expect(status2xx);
            const userAfter = await testKit.models.user.findById(id);
            const credentialsChangedAtAfter = userAfter!.credentialsChangedAt;
            expect(credentialsChangedAtAfter.getTime()).toBeGreaterThan(
                credentialsChangedAtBefore.getTime(),
            );
        });

        test('user is deleted from cache', async () => {
            const { sessionToken, id } = await createUser(UserRole.READONLY);
            // cache the user
            await testKit.agent
                .get(`${testKit.urls.usersAPI}/${id}`)
                .set('Authorization', `Bearer ${sessionToken}`)
                .expect(statusCodes.OK);
            const cacheKey = makeUsersCacheKey(id);
            const cachedUserBefore = await testKit.redisService.get(cacheKey);
            expect(cachedUserBefore).not.toBeNull();
            // update user
            await testKit.agent
                .patch(`${testKit.urls.usersAPI}/${id}`)
                .set('Authorization', `Bearer ${sessionToken}`)
                .send({ email: testKit.userData.email })
                .expect(statusCodes.OK);
            // verify user is removed from cache
            const cachedUserAfter = await testKit.redisService.get(cacheKey);
            expect(cachedUserAfter).toBeNull();
        });

        describe('Cache update fails', () => {
            test('request is successful', async () => {
                disableSystemErrorLogsForThisTest();
                const cacheSvcDeleteMock = jest
                    .spyOn(CacheService.prototype, 'delete')
                    .mockRejectedValue(new Error());
                const { sessionToken, id } = await createUser(UserRole.READONLY);
                await testKit.agent
                    .patch(`${testKit.urls.usersAPI}/${id}`)
                    .set('Authorization', `Bearer ${sessionToken}`)
                    .send({ email: testKit.userData.email })
                    .expect(status2xx);
                expect(cacheSvcDeleteMock).toHaveBeenCalledTimes(1);
            });
        });

        describe('Sessions revocation fails', () => {
            test('request is successful', async () => {
                disableSystemErrorLogsForThisTest();
                const refreshTokenSvcRevokeAllMock = jest
                    .spyOn(RefreshTokenService.prototype, 'revokeAll')
                    .mockRejectedValue(new Error());
                const { sessionToken, id } = await createUser(UserRole.READONLY);
                await testKit.agent
                    .patch(`${testKit.urls.usersAPI}/${id}`)
                    .set('Authorization', `Bearer ${sessionToken}`)
                    .send({ email: testKit.userData.email })
                    .expect(status2xx);
                expect(refreshTokenSvcRevokeAllMock).toHaveBeenCalledTimes(1);
            });
        });
    });

    describe('Password is updated', () => {
        test('revoke all the session tokens from redis', async () => {
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
            // update
            await testKit.agent
                .patch(`${testKit.urls.usersAPI}/${id}`)
                .send({ password: testKit.userData.password })
                .set('Authorization', `Bearer ${sessionToken}`)
                .expect(status2xx);
            // tokens not in refresh tokens index list
            const listKey = makeRefreshTokenIndexKey(id);
            const token1InList = await testKit.redisService.belongsToList(listKey, refresh1Jti);
            const token2InList = await testKit.redisService.belongsToList(listKey, refresh2Jti);
            expect(token1InList).toBeFalsy();
            expect(token2InList).toBeFalsy();
            // tokens not in refresh-tokens database
            const token1Key = makeRefreshTokenKey(id, refresh1Jti);
            const token2Key = makeRefreshTokenKey(id, refresh2Jti);
            const token1InRedis = await testKit.redisService.get(token1Key);
            const token2InRedis = await testKit.redisService.get(token2Key);
            expect(token1InRedis).toBeNull();
            expect(token2InRedis).toBeNull();
        });

        test('update credentialsChangedAt property', async () => {
            const { sessionToken, id } = await createUser(getRandomRole());
            const userBefore = await testKit.models.user.findById(id);
            const credentialsChangedAtBefore = userBefore!.credentialsChangedAt;
            // wait 1 second to ensure the timestamp will be different
            await new Promise((resolve) => setTimeout(resolve, 1000));
            await testKit.agent
                .patch(`${testKit.urls.usersAPI}/${id}`)
                .send({ password: testKit.userData.password })
                .set('Authorization', `Bearer ${sessionToken}`)
                .expect(status2xx);
            const userAfter = await testKit.models.user.findById(id);
            const credentialsChangedAtAfter = userAfter!.credentialsChangedAt;
            expect(credentialsChangedAtAfter.getTime()).toBeGreaterThan(
                credentialsChangedAtBefore.getTime(),
            );
        });

        test('user is NOT deleted from cache', async () => {
            const { sessionToken, id } = await createUser(UserRole.READONLY);
            // cache the user
            await testKit.agent
                .get(`${testKit.urls.usersAPI}/${id}`)
                .set('Authorization', `Bearer ${sessionToken}`)
                .expect(statusCodes.OK);
            const cacheKey = makeUsersCacheKey(id);
            const cachedUserBefore = await testKit.redisService.get(cacheKey);
            expect(cachedUserBefore).not.toBeNull();
            // update user
            await testKit.agent
                .patch(`${testKit.urls.usersAPI}/${id}`)
                .set('Authorization', `Bearer ${sessionToken}`)
                .send({ password: testKit.userData.password })
                .expect(statusCodes.OK);
            // verify if user was deleted from cache
            const cachedUserAfter = await testKit.redisService.get(cacheKey);
            expect(cachedUserAfter).not.toBeNull();
        });

        describe('Sessions revocation fails', () => {
            test('request is successful', async () => {
                disableSystemErrorLogsForThisTest();
                const refreshTokenSvcRevokeAllMock = jest
                    .spyOn(RefreshTokenService.prototype, 'revokeAll')
                    .mockRejectedValue(new Error());
                const { sessionToken, id } = await createUser(UserRole.READONLY);
                await testKit.agent
                    .patch(`${testKit.urls.usersAPI}/${id}`)
                    .set('Authorization', `Bearer ${sessionToken}`)
                    .send({ password: testKit.userData.password })
                    .expect(status2xx);
                expect(refreshTokenSvcRevokeAllMock).toHaveBeenCalledTimes(1);
            });
        });
    });

    describe('User EDITOR is updated', () => {
        test('email change triggers role downgrade to "readonly" and "emailValidated" to false', async () => {
            const { sessionToken, id } = await createUser(UserRole.EDITOR);
            await testKit.agent
                .patch(`${testKit.urls.usersAPI}/${id}`)
                .set('Authorization', `Bearer ${sessionToken}`)
                .send({ email: testKit.userData.email })
                .expect(status2xx);
            const updatedUserInDb = await testKit.models.user.findById(id);
            expect(updatedUserInDb!.emailValidated).toBeFalsy();
            expect(updatedUserInDb?.role).toBe(UserRole.READONLY);
        });
    });

    describe('User ADMIN is updated', () => {
        test('email change does not downgrade role or modifies "emailValidated" property', async () => {
            const { sessionToken, id } = await createUser(UserRole.ADMIN);
            // Set emailValidated to true before the test
            await testKit.models.user.findByIdAndUpdate(id, { emailValidated: true });
            await testKit.agent
                .patch(`${testKit.urls.usersAPI}/${id}`)
                .set('Authorization', `Bearer ${sessionToken}`)
                .send({ email: testKit.userData.email })
                .expect(status2xx);
            const updatedUserInDb = await testKit.models.user.findById(id);
            expect(updatedUserInDb).not.toBeNull();
            expect(updatedUserInDb?.emailValidated).toBeTruthy();
            expect(updatedUserInDb?.role).toBe(UserRole.ADMIN);
        });
    });

    describe('No field to update is provided', () => {
        test(`return 400 status code and no properties to update error message`, async () => {
            const { sessionToken, id } = await createUser(UserRole.READONLY);
            const { statusCode, body } = await testKit.agent
                .patch(`${testKit.urls.usersAPI}/${id}`)
                .set('Authorization', `Bearer ${sessionToken}`)
                .send();
            expect(body).toStrictEqual({ error: usersApiErrors.NO_PROPERTIES_TO_UPDATE });
            expect(statusCode).toBe(400);
        });
    });

    describe('User email already exists', () => {
        test(`return 409 status code and user already exists error message`, async () => {
            const user1 = await testKit.models.user.create(testKit.userData.user);
            const response = await testKit.agent.post(testKit.urls.register).send({
                ...testKit.userData.user,
                email: user1.email,
            });
            expect(response.body).toStrictEqual({ error: usersApiErrors.ALREADY_EXISTS });
            expect(response.statusCode).toBe(409);
        });
    });

    describe('Username already exists', () => {
        test(`return 409 status code and user already exists error message`, async () => {
            const existingUser = await createUser();
            const { sessionToken, id } = await createUser(UserRole.READONLY);
            const { statusCode, body } = await testKit.agent
                .patch(`${testKit.urls.usersAPI}/${id}`)
                .set('Authorization', `Bearer ${sessionToken}`)
                .send({ name: existingUser.name });
            expect(body).toStrictEqual({ error: usersApiErrors.ALREADY_EXISTS });
            expect(statusCode).toBe(409);
        });
    });

    describe.each(Object.values(UserRole))('%s attempts to update themselves', (role) => {
        test('successfully updates user', async () => {
            const { sessionToken, id } = await createUser(role);
            await testKit.agent
                .patch(`${testKit.urls.usersAPI}/${id}`)
                .set('Authorization', `Bearer ${sessionToken}`)
                .send({ name: testKit.userData.name })
                .expect(status2xx);
        });
    });

    describe.each([UserRole.EDITOR, UserRole.READONLY])(
        'Admin attempts to update a %s',
        (targetRole) => {
            test('successfully updates user', async () => {
                const { sessionToken: currentUserSessionToken } = await createUser(UserRole.ADMIN);
                const { id: targetUserId } = await createUser(targetRole);
                await testKit.agent
                    .patch(`${testKit.urls.usersAPI}/${targetUserId}`)
                    .set('Authorization', `Bearer ${currentUserSessionToken}`)
                    .send({ name: testKit.userData.name })
                    .expect(status2xx);
            });
        },
    );

    describe('ADMIN attempts to update another ADMIN', () => {
        test('return 403 status code and forbidden error message', async () => {
            const { sessionToken: currentUserSessionToken } = await createUser(UserRole.ADMIN);
            const { id: targetUserId } = await createUser(UserRole.ADMIN);
            const { statusCode, body } = await testKit.agent
                .patch(`${testKit.urls.usersAPI}/${targetUserId}`)
                .set('Authorization', `Bearer ${currentUserSessionToken}`)
                .send({ name: testKit.userData.name });
            expect(body).toStrictEqual({ error: authErrors.FORBIDDEN });
            expect(statusCode).toBe(403);
        });
    });

    describe.each(Object.values(UserRole))('EDITOR attempts to update a %s', (targetRole) => {
        test(`return 403 status code and forbidden error message`, async () => {
            const { sessionToken: currentUserSessionToken } = await createUser(UserRole.EDITOR);
            const { id: targetUserId } = await createUser(targetRole);
            const { statusCode, body } = await testKit.agent
                .patch(`${testKit.urls.usersAPI}/${targetUserId}`)
                .set('Authorization', `Bearer ${currentUserSessionToken}`)
                .send({ name: testKit.userData.name });
            expect(body).toStrictEqual({ error: authErrors.FORBIDDEN });
            expect(statusCode).toBe(403);
        });
    });

    describe.each(Object.values(UserRole))('READONLY attempts to update a %s', (targetRole) => {
        test(`return 403 status code and forbidden error message`, async () => {
            const { sessionToken: currentUserSessionToken } = await createUser(UserRole.READONLY);
            const { id: targetUserId } = await createUser(targetRole);
            const { statusCode, body } = await testKit.agent
                .patch(`${testKit.urls.usersAPI}/${targetUserId}`)
                .set('Authorization', `Bearer ${currentUserSessionToken}`)
                .send({ name: testKit.userData.name });
            expect(body).toStrictEqual({ error: authErrors.FORBIDDEN });
            expect(statusCode).toBe(403);
        });
    });

    describe('More than 100 requests in 300s', () => {
        test('return 429 status code and too many requests error message', async () => {
            const ip = faker.internet.ip();
            const { sessionToken, id } = await createUser(UserRole.READONLY);
            for (let i = 0; i < rateLimitingSettings[RateLimiter.relaxed].max; i++) {
                await testKit.agent
                    .patch(`${testKit.urls.usersAPI}/${id}`)
                    .set('Authorization', `Bearer ${sessionToken}`)
                    .set('X-Forwarded-For', ip)
                    .send({ name: testKit.userData.name });
            }
            const response = await testKit.agent
                .patch(`${testKit.urls.usersAPI}/${id}`)
                .set('Authorization', `Bearer ${sessionToken}`)
                .set('X-Forwarded-For', ip)
                .send({ name: testKit.userData.name });
            expect(response.body).toStrictEqual({ error: commonErrors.TOO_MANY_REQUESTS });
            expect(response.statusCode).toBe(statusCodes.TOO_MANY_REQUESTS);
        });
    });
});
