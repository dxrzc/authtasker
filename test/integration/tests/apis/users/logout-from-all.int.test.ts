import request from 'supertest';
import { faker } from '@faker-js/faker/.';
import { testKit } from '@integration/utils/testKit.util';
import { status2xx } from '@integration/utils/status2xx.util';
import { createUser } from '@integration/utils/createUser.util';
import { usersLimits } from '@root/common/constants/user.constants';
import { getRandomRole } from '@integration/utils/get-random-role.util';
import { makeRefreshTokenKey } from '@logic/token/make-refresh-token-key';
import { authErrors } from '@root/common/errors/messages/auth.error.messages';
import { makeRefreshTokenIndexKey } from '@logic/token/make-refresh-token-index-key';
import { usersApiErrors } from '@root/common/errors/messages/users-api.error.messages';

describe('Logout from all', () => {
    describe('Password is not provided', () => {
        test('return status 400 BAD REQUEST and PASSWORD_NOT_PROVIDED error message', async () => {
            const expectedStatus = 400;
            const { sessionToken } = await createUser(getRandomRole());
            const response = await request(testKit.server)
                .post(testKit.endpoints.logoutFromAll)
                .set(`Authorization`, `Bearer ${sessionToken}`);
            expect(response.body).toStrictEqual({ error: usersApiErrors.PASSWORD_NOT_PROVIDED });
            expect(response.statusCode).toBe(expectedStatus);
        });
    });

    describe('Invalid password length', () => {
        test('return status 400 BAD REQUEST and INVALID_PASSWORD_LENGTH error message', async () => {
            const expectedStatus = 400;
            const { sessionToken } = await createUser(getRandomRole());
            const response = await request(testKit.server)
                .post(testKit.endpoints.logoutFromAll)
                .set(`Authorization`, `Bearer ${sessionToken}`)
                .send({ password: faker.string.alpha(usersLimits.MAX_PASSWORD_LENGTH + 1) });
            expect(response.body).toStrictEqual({ error: usersApiErrors.INVALID_PASSWORD_LENGTH });
            expect(response.statusCode).toBe(expectedStatus);
        });
    });

    describe('Password does not match', () => {
        test('return status 400 BAD REQUEST and INVALID_CREDENTIALS error message', async () => {
            const expectedStatus = 400;
            const { sessionToken } = await createUser(getRandomRole());
            const response = await request(testKit.server)
                .post(testKit.endpoints.logoutFromAll)
                .set(`Authorization`, `Bearer ${sessionToken}`)
                .send({ password: testKit.userDataGenerator.password() });
            expect(response.body).toStrictEqual({ error: authErrors.INVALID_CREDENTIALS });
            expect(response.statusCode).toBe(expectedStatus);
        });
    });

    describe('User has reached the max number of refresh tokens', () => {
        describe('User revokes all', () => {
            let refreshTokensIDS = new Array<string>;
            let userId: string;
            beforeAll(async () => {
                // create user and get the first token
                const { refreshToken, unhashedPassword, sessionToken, userId: id } = await createUser(getRandomRole());
                const refreshTokenID = testKit.refreshJwt.verify(refreshToken)?.jti!;
                refreshTokensIDS.push(refreshTokenID);
                userId = id;
                // generate refresh tokens until the maximum per user is reached         
                for (let i = 0; i < testKit.configService.MAX_REFRESH_TOKENS_PER_USER - 1; ++i) {
                    const tokenData = await testKit.refreshTokenService.generate(userId, { meta: true });
                    refreshTokensIDS.push(tokenData.jti);
                }
                // all tokens in database                
                for (const refreshId of refreshTokensIDS) {
                    const tokenInRedis = await testKit.redisService.get(makeRefreshTokenKey(userId, refreshId));
                    expect(tokenInRedis).not.toBeNull();
                }
                // refresh index has reached the maximum
                const refreshTokensCount = await testKit.redisService.getSetSize(makeRefreshTokenIndexKey(userId));
                expect(refreshTokensCount).toBe(testKit.configService.MAX_REFRESH_TOKENS_PER_USER);
                // logout from all, revoking all the refresh tokens
                await request(testKit.server)
                    .post(testKit.endpoints.logoutFromAll)
                    .set(`Authorization`, `Bearer ${sessionToken}`)
                    .send({ password: unhashedPassword })
                    .expect(status2xx);
            });

            test('all the refresh tokens are deleted from redis database', async () => {
                for (const refreshId of refreshTokensIDS) {
                    const tokenInRedis = await testKit.redisService.get(makeRefreshTokenKey(userId, refreshId));
                    expect(tokenInRedis).toBeNull();
                }
            });

            test('user refresh-tokens count is set to 0', async () => {
                const refreshTokensCount = await testKit.redisService.getSetSize(makeRefreshTokenIndexKey(userId));
                expect(refreshTokensCount).toBe(0);
            });
        });
    });
});