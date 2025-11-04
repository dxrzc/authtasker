import request from 'supertest';
import { JwtTypes } from 'src/enums/jwt-types.enum';
import { testKit } from '@integration/utils/testKit.util';
import { status2xx } from '@integration/utils/status2xx.util';
import { createUser } from '@integration/utils/createUser.util';
import { getRandomRole } from '@test/tools/utilities/get-random-role.util';
import { makeRefreshTokenKey } from 'src/common/logic/token/make-refresh-token-key';
import { authErrors } from 'src/common/errors/messages/auth.error.messages';
import { makeRefreshTokenIndexKey } from 'src/common/logic/token/make-refresh-token-index-key';

describe('POST /api/users/logout', () => {
    describe('Tokens', () => {
        describe('Refresh token not provided in body', () => {
            test(
                'return status 400 BAD REQUEST and the configured error messg',
                async () => {
                    const expectedStatus = 400;
                    const { sessionToken, refreshToken } = await createUser(getRandomRole());
                    // logout
                    const response = await request(testKit.server)
                        .post(testKit.endpoints.logout)
                        .set('Authorization', `Bearer ${sessionToken}`);
                    expect(response.body).toStrictEqual({
                        error: authErrors.REFRESH_TOKEN_NOT_PROVIDED_IN_BODY,
                    });
                    expect(response.statusCode).toBe(expectedStatus);
                },
            );
        });

        test('session token is blacklisted after logout', async () => {
            const { sessionToken, refreshToken } = await createUser('editor');
            // logout
            await request(testKit.server)
                .post(testKit.endpoints.logout)
                .set('Authorization', `Bearer ${sessionToken}`)
                .send({ refreshToken })
                .expect(status2xx);
            // session token should be blacklisted
            const sessionJti = testKit.sessionJwt.verify(sessionToken)?.jti!;
            const token = await testKit.jwtBlacklistService.tokenInBlacklist(
                JwtTypes.session,
                sessionJti,
            );
            expect(token).not.toBeNull();
        });

        test('refresh token is deleted from redis databases', async () => {
            const { sessionToken, refreshToken, userId } = await createUser(getRandomRole());
            // logout
            await request(testKit.server)
                .post(testKit.endpoints.logout)
                .set('Authorization', `Bearer ${sessionToken}`)
                .send({ refreshToken })
                .expect(status2xx);
            const refreshJti = testKit.refreshJwt.verify(refreshToken)?.jti!;
            // deleted from refresh tokens db
            await expect(
                testKit.redisService.get(makeRefreshTokenKey(userId, refreshJti)),
            ).resolves.toBeNull();
            // deleted from user set
            await expect(
                testKit.redisService.belongsToSet(makeRefreshTokenIndexKey(userId), refreshJti),
            ).resolves.toBeFalsy();
        });
    });

    describe('Response', () => {
        test('return 204 NO CONTENT', async () => {
            const expectedStatus = 204;
            const { sessionToken, refreshToken } = await createUser(getRandomRole());
            const response = await request(testKit.server)
                .post(testKit.endpoints.logout)
                .set('Authorization', `Bearer ${sessionToken}`)
                .send({ refreshToken });
            expect(response.body).toStrictEqual({});
            expect(response.statusCode).toBe(expectedStatus);
        });
    });
});
