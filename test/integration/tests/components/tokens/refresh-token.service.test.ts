import { Types } from 'mongoose';
import ms, { StringValue } from 'ms';
import { JwtService } from '@root/services/jwt.service';
import { testKit } from '@integration/utils/testKit.util';
import { getRandomRole } from '@integration/utils/get-random-role.util';
import { HttpError } from '@root/common/errors/classes/http-error.class';
import { makeRefreshTokenKey } from '@logic/token/make-refresh-token-key';
import { RefreshTokenService } from '@root/services/refresh-token.service';
import { authErrors } from '@root/common/errors/messages/auth.error.messages';
import { makeRefreshTokenIndexKey } from '@logic/token/make-refresh-token-index-key';

let refreshTokenService: RefreshTokenService;

describe('Refresh Token Service', () => {
    beforeAll(() => {
        refreshTokenService = new RefreshTokenService(
            testKit.configService,
            testKit.refreshJwt,
            testKit.loggerServiceMock,
            testKit.redisService,
            testKit.userModel,
        );
    });

    async function createUser() {
        const role = getRandomRole();
        const userCreated = await testKit.userModel.create({
            ...testKit.userDataGenerator.fullUser(),
            emailValidated: (role !== 'readonly'),
            role,
        });
        return { userId: userCreated.id };
    }

    describe('generate', () => {
        test('store token in redis database with the configured exp time in envs', async () => {
            // get a valid token jti
            const { userId } = await createUser();
            const { jti, id } = await refreshTokenService.generate(userId, { meta: true });
            // calculate token exp
            const expTimeEnvInSeconds = Math.floor(ms(testKit.configService.JWT_REFRESH_EXP_TIME as StringValue) / 1000);
            const ttlInSecondsFromRedis = await testKit.redisInstance.ttl(makeRefreshTokenKey(id, jti));
            expect(ttlInSecondsFromRedis).toBeDefined();
            expect(Math.abs(expTimeEnvInSeconds - ttlInSecondsFromRedis)).toBeLessThanOrEqual(1);
        });

        test('store token in the user refresh tokens set', async () => {
            // get a valid token jti
            const { userId } = await createUser();
            const { jti, id } = await refreshTokenService.generate(userId, { meta: true });
            // jti should be in the user's set
            const jtiInSet = await testKit.redisService.belongsToSet(makeRefreshTokenIndexKey(userId), jti);
            expect(jtiInSet).toBeTruthy();
        });
    });

    describe('rotate', () => {
        test('return a new refresh token with the same exp date as the previous one', async () => {
            const { userId } = await createUser();
            // generate old token
            const oldToken = await refreshTokenService.generate(userId);
            const oldTokenExpDateUnix = testKit.refreshJwt.verify(oldToken)?.exp!;
            // rotate token
            const newToken = await refreshTokenService.rotate(oldToken);
            const newTokenExpDateUnix = testKit.refreshJwt.verify(newToken)?.exp!;
            // expires at the same date
            expect(newTokenExpDateUnix).toBe(oldTokenExpDateUnix);
        });

        test('delete the previous token jti from redis database', async () => {
            const { userId } = await createUser();
            // generate a token
            const { jti, id, token } = await refreshTokenService.generate(userId, { meta: true });
            // token in redis
            const inRedis = await testKit.redisService.get(makeRefreshTokenKey(id, jti));
            expect(inRedis).not.toBeNull()
            // rotate
            await refreshTokenService.rotate(token);
            // previously token shouldn't be in redis anymore
            const oldTokenInRedis = await testKit.redisService.get(makeRefreshTokenKey(id, jti));
            expect(oldTokenInRedis).toBeNull();
        });

        test('store the new token jti in redis database with the same ttl as the previous one', async () => {
            const { userId } = await createUser();
            // generate old token
            const { token: oldToken, expSeconds: oldTokenExpSeconds } = await refreshTokenService.generate(userId, { meta: true });
            // rotate token
            const { id: newTokenUserId, jti: newTokenJti } = await refreshTokenService.rotate(oldToken, { meta: true });
            // new token stored for oldTokenExpSeconds
            const newTokenTTLInRedis = await testKit.redisInstance.ttl(makeRefreshTokenKey(newTokenUserId, newTokenJti));
            expect(newTokenTTLInRedis).toBe(oldTokenExpSeconds);
        });

        test('delete previous token jti from user refresh tokens index', async () => {
            const { userId } = await createUser();
            // generate old token
            const { token: oldToken, jti: oldTokenJti } = await refreshTokenService.generate(userId, { meta: true });
            // rotate token
            await refreshTokenService.rotate(oldToken, { meta: true });
            // token should'nt be in user's set anymore
            const oldTokenJtiInSet = await testKit.redisService.belongsToSet(makeRefreshTokenIndexKey(userId), oldTokenJti);
            expect(oldTokenJtiInSet).toBeFalsy();
        });

        test('store the new token jti in user refresh tokens index', async () => {
            const { userId } = await createUser();
            // generate old token
            const { token: oldToken } = await refreshTokenService.generate(userId, { meta: true });
            // rotate token
            const { jti: newTokenJti } = await refreshTokenService.rotate(oldToken, { meta: true });
            //  new token jti should be in the user set
            const newTokenJtiInSet = await testKit.redisService.belongsToSet(makeRefreshTokenIndexKey(userId), newTokenJti);
            expect(newTokenJtiInSet).toBeTruthy();
        });

        describe('Token is not in redis database', () => {
            test('throw HttpError UNAUTHORIZED and invalid token message', async () => {
                // valid token but never saved in redis db
                const { userId } = await createUser();
                const { token: invalidToken } = testKit.refreshJwt.generate('20m', {
                    id: userId
                });
                await expect(refreshTokenService.rotate(invalidToken))
                    .rejects
                    .toThrow(HttpError.unAuthorized(authErrors.INVALID_TOKEN));
            });
        });

        describe('Token is expired', () => {
            test('throw HttpError UNAUTHORIZED and invalid token message', async () => {
                jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 1000000000)
                const { userId } = await createUser();
                const { token: expiredToken } = testKit.refreshJwt.generate('10s', {
                    id: userId
                });
                await expect(refreshTokenService.rotate(expiredToken))
                    .rejects
                    .toThrow(HttpError.unAuthorized(authErrors.INVALID_TOKEN));
            });
        });

        describe('Token is not signed by this server', () => {
            test('throw HttpError UNAUTHORIZED and invalid token message', async () => {
                const { userId } = await createUser();
                // generate a token with another key
                const jwtService = new JwtService('badkey');
                const { token: invalidToken } = jwtService.generate('20m', {
                    id: userId,
                });
                await expect(refreshTokenService.rotate(invalidToken))
                    .rejects
                    .toThrow(HttpError.unAuthorized(authErrors.INVALID_TOKEN));
            });
        });

        describe('Token with no user field is provided', () => {
            test('throw HttpError UNAUTHORIZED and invalid token message', async () => {
                // generate a signed token with no user field
                const { token: invalidToken } = testKit.refreshJwt.generate('20m', {});
                await expect(refreshTokenService.rotate(invalidToken))
                    .rejects
                    .toThrow(HttpError.unAuthorized(authErrors.INVALID_TOKEN));
            });
        });

        describe('User in token not found', () => {
            test('throw HttpError UNAUTHORIZED and invalid token message', async () => {
                const { token: invalidToken } = testKit.refreshJwt.generate('20m', {
                    id: new Types.ObjectId()
                });
                await expect(refreshTokenService.rotate(invalidToken))
                    .rejects
                    .toThrow(HttpError.unAuthorized(authErrors.INVALID_TOKEN));
            });
        });
    });

    describe('revokeToken', () => {
        test('delete token from redis database', async () => {
            const { userId } = await createUser();
            const { id, jti } = await refreshTokenService.generate(userId, { meta: true });
            // revoke
            await refreshTokenService.revokeToken(id, jti);
            const tokenInRedis = await testKit.redisService.get(makeRefreshTokenKey(id, jti));
            expect(tokenInRedis).toBeNull();
        });

        test('delete token from the user refresh tokens set', async () => {
            const { userId } = await createUser();
            const { id, jti } = await refreshTokenService.generate(userId, { meta: true });
            // revoke
            await refreshTokenService.revokeToken(id, jti);
            // jti shouldn't be in the user's set
            const jtiInSet = await testKit.redisService.belongsToSet(makeRefreshTokenIndexKey(userId), jti);
            expect(jtiInSet).toBeFalsy();
        });
    });

    describe('revokeAllToken', () => {
        test('delete all the tokens asocciated to user in redis database', async () => {
            // create 3 tokens for this user
            const { userId } = await createUser();
            const { id: token1UserId, jti: token1Jti } = await refreshTokenService.generate(userId, { meta: true });
            const { id: token2UserId, jti: token2Jti } = await refreshTokenService.generate(userId, { meta: true });
            const { id: token3UserId, jti: token3Jti } = await refreshTokenService.generate(userId, { meta: true });
            // revoke all tokens
            await refreshTokenService.revokeAll(userId);
            // tokens shouldn't exist in redis db
            await expect(testKit.redisService.get(makeRefreshTokenKey(token1UserId, token1Jti))).resolves.toBeNull()
            await expect(testKit.redisService.get(makeRefreshTokenKey(token2UserId, token2Jti))).resolves.toBeNull()
            await expect(testKit.redisService.get(makeRefreshTokenKey(token3UserId, token3Jti))).resolves.toBeNull()
        });

        test('user refresh tokens set remains empty', async () => {
            // create 3 tokens for this user
            const { userId } = await createUser();
            await Promise.all([
                refreshTokenService.generate(userId, { meta: true }),
                refreshTokenService.generate(userId, { meta: true }),
                refreshTokenService.generate(userId, { meta: true }),
            ])
            // revoke all tokens
            await refreshTokenService.revokeAll(userId);
            // count jtis in set
            const jtis = await testKit.redisService.getSetSize(makeRefreshTokenIndexKey(userId));
            expect(jtis).toBe(0);
        });
    });
});

