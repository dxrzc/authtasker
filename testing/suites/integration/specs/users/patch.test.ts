import { testKit } from '@integration/kit/test.kit';
import { createUser } from '@integration/utils/create-user.util';
import { status2xx } from '@integration/utils/status-2xx.util';
import { getRandomRole } from '@test/tools/utilities/get-random-role.util';
import { UserRole } from 'src/enums/user-role.enum';
import { makeRefreshTokenIndexKey } from 'src/functions/token/make-refresh-token-index-key';
import { makeRefreshTokenKey } from 'src/functions/token/make-refresh-token-key';
import { makeSessionTokenBlacklistKey } from 'src/functions/token/make-session-token-blacklist-key';
import { authErrors } from 'src/messages/auth.error.messages';
import { usersApiErrors } from 'src/messages/users-api.error.messages';

describe(`PATCH ${testKit.urls.usersAPI}/:id`, () => {
    describe('Successful update', () => {
        test('should return status 200 and the updated user data in db', async () => {
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

        test.todo('name should be transformed to lowercase and trimmed in db');
        test.todo('reflect updated data in db');
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

        test('blacklist the provided session token', async () => {
            const { sessionToken, id } = await createUser(getRandomRole());
            const sessionTokenJti = testKit.sessionJwt.verify(sessionToken)!.jti;
            await testKit.agent
                .patch(`${testKit.urls.usersAPI}/${id}`)
                .send({ email: testKit.userData.email })
                .set('Authorization', `Bearer ${sessionToken}`)
                .expect(status2xx);
            const redisKey = makeSessionTokenBlacklistKey(sessionTokenJti);
            const blacklisted = await testKit.redisService.get(redisKey);
            expect(blacklisted).not.toBeNull();
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

        test('blacklist the provided session token', async () => {
            const { sessionToken, id } = await createUser(getRandomRole());
            const sessionTokenJti = testKit.sessionJwt.verify(sessionToken)!.jti;
            await testKit.agent
                .patch(`${testKit.urls.usersAPI}/${id}`)
                .send({ password: testKit.userData.password })
                .set('Authorization', `Bearer ${sessionToken}`)
                .expect(status2xx);
            const redisKey = makeSessionTokenBlacklistKey(sessionTokenJti);
            const blacklisted = await testKit.redisService.get(redisKey);
            expect(blacklisted).not.toBeNull();
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
        test.todo('email change does not downgrade role or modifies "emailValidated" property');
    });

    describe('No field to update is provided', () => {
        test(`return 400 status code and "${usersApiErrors.NO_PROPERTIES_TO_UPDATE}" message`, async () => {
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
        test(`return 409 status code and "${usersApiErrors.ALREADY_EXISTS}" message`, async () => {
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
        test.todo(`return 409 status code and "${usersApiErrors.ALREADY_EXISTS}" message`);
    });

    describe('ADMIN attempts to update an EDITOR', () => {
        test('should succeed', async () => {
            const { sessionToken: currentUserSessionToken } = await createUser(UserRole.ADMIN);
            const { id: targetUserId } = await createUser(UserRole.EDITOR);
            await testKit.agent
                .patch(`${testKit.urls.usersAPI}/${targetUserId}`)
                .set('Authorization', `Bearer ${currentUserSessionToken}`)
                .send({ name: testKit.userData.name })
                .expect(status2xx);
        });
    });

    describe('ADMIN attempts to update a READONLY', () => {
        test('should succeed', async () => {
            const { sessionToken: currentUserSessionToken } = await createUser(UserRole.ADMIN);
            const { id: targetUserId } = await createUser(UserRole.READONLY);
            await testKit.agent
                .patch(`${testKit.urls.usersAPI}/${targetUserId}`)
                .set('Authorization', `Bearer ${currentUserSessionToken}`)
                .send({ name: testKit.userData.name })
                .expect(status2xx);
        });
    });

    describe('EDITOR attempts to update another EDITOR', () => {
        test(`should return 403 status code and "${authErrors.FORBIDDEN}" message`, async () => {
            const { sessionToken: currentUserSessionToken } = await createUser(UserRole.EDITOR);
            const { id: targetUserId } = await createUser(UserRole.EDITOR);
            const { statusCode, body } = await testKit.agent
                .patch(`${testKit.urls.usersAPI}/${targetUserId}`)
                .set('Authorization', `Bearer ${currentUserSessionToken}`)
                .send({ name: testKit.userData.name });
            expect(body).toStrictEqual({ error: authErrors.FORBIDDEN });
            expect(statusCode).toBe(403);
        });
    });

    describe('READONLY attemps to update another READONLY', () => {
        test(`should return 403 status code and "${authErrors.FORBIDDEN}" message`, async () => {
            const { sessionToken: currentUserSessionToken } = await createUser(UserRole.READONLY);
            const { id: targetUserId } = await createUser(UserRole.READONLY);
            const { statusCode, body } = await testKit.agent
                .patch(`${testKit.urls.usersAPI}/${targetUserId}`)
                .set('Authorization', `Bearer ${currentUserSessionToken}`)
                .send({ name: testKit.userData.name });
            expect(body).toStrictEqual({ error: authErrors.FORBIDDEN });
            expect(statusCode).toBe(403);
        });
    });

    describe('EDITOR attemps to update a READONLY', () => {
        test(`should return 403 status code and "${authErrors.FORBIDDEN}" message`, async () => {
            const { sessionToken: currentUserSessionToken } = await createUser(UserRole.EDITOR);
            const { id: targetUserId } = await createUser(UserRole.READONLY);
            const { statusCode, body } = await testKit.agent
                .patch(`${testKit.urls.usersAPI}/${targetUserId}`)
                .set('Authorization', `Bearer ${currentUserSessionToken}`)
                .send({ name: testKit.userData.name });
            expect(body).toStrictEqual({ error: authErrors.FORBIDDEN });
            expect(statusCode).toBe(403);
        });
    });
});
