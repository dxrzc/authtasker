import ms, { StringValue } from 'ms';
import { testKit } from '@integration/utils/testKit.util';
import { createUser } from '@integration/utils/createUser.util';
import { calculateTokenTTL } from '@logic/token/calculate-token-ttl';
import { getRandomRole } from '@integration/utils/get-random-role.util';
import { makeRefreshTokenKey } from '@logic/token/make-refresh-token-key';
import { RefreshTokenService } from '@root/services/refresh-token.service';
import { JwtService } from '@root/services/jwt.service';
import { HttpError } from '@root/common/errors/classes/http-error.class';
import { authErrors } from '@root/common/errors/messages/auth.error.messages';
import { Types } from 'mongoose';

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

    describe('generate', () => {
        test('store token in redis database with the configured exp time in envs', async () => {
            // get a valid token jti
            const { userId } = await createUser(getRandomRole());
            const token = await refreshTokenService.generate(userId);
            const payload = testKit.refreshJwt.verify(token)!;
            expect(payload).toBeDefined();
            // calculate token exp
            const expTimeEnvInSeconds = Math.floor(ms(testKit.configService.JWT_REFRESH_EXP_TIME as StringValue) / 1000);
            const ttlInSecondsFromRedis = await testKit.redisInstance.ttl(makeRefreshTokenKey(payload.id, payload!.jti));
            expect(ttlInSecondsFromRedis).toBeDefined();
            expect(expTimeEnvInSeconds).toBe(ttlInSecondsFromRedis);
        });
    });

    describe('rotate', () => {
        test('return a new refresh token with the same exp date as the previous one', async () => {
            const { userId } = await createUser(getRandomRole());
            // generate old token
            const oldToken = await refreshTokenService.generate(userId);
            const oldTokenExpDateUnix = testKit.refreshJwt.verify(oldToken)?.exp!;
            // rotate token
            const newToken = await refreshTokenService.rotate(oldToken);
            const newTokenExpDateUnix = testKit.refreshJwt.verify(newToken)?.exp!;
            // expires at the same date
            expect(newTokenExpDateUnix).toBe(oldTokenExpDateUnix);
        });

        test('delete the previous token from redis database', async () => {
            const { userId } = await createUser(getRandomRole());
            // generate old token
            const oldToken = await refreshTokenService.generate(userId);
            const oldTokenPayload = testKit.refreshJwt.verify(oldToken)!;
            expect(oldTokenPayload).toBeDefined();
            // old token in redis
            const inRedis = await testKit.redisService.get(makeRefreshTokenKey(oldTokenPayload.id, oldTokenPayload.jti));
            expect(inRedis).not.toBeNull()
            // rotate
            await refreshTokenService.rotate(oldToken);
            // old token shouldn't be in redis anymore
            const oldTokenInRedis = await testKit.redisService.get(makeRefreshTokenKey(oldTokenPayload.id, oldTokenPayload.jti));
            expect(oldTokenInRedis).toBeNull();
        });

        test('store the new token jti in redis database with the same ttl as the previous one', async () => {
            const { userId } = await createUser(getRandomRole());
            // generate old token
            const oldToken = await refreshTokenService.generate(userId);
            const oldTokenExpDateUnix = testKit.refreshJwt.verify(oldToken)?.exp!;
            const oldTokenTTLSeconds = calculateTokenTTL(oldTokenExpDateUnix);
            // rotate token
            const newToken = await refreshTokenService.rotate(oldToken);
            const newTokenPayload = testKit.refreshJwt.verify(newToken)!;
            expect(newTokenPayload).toBeDefined();
            // new token stored for oldTokenTTLSeconds
            const newTokenTTLInRedis = await testKit.redisInstance.ttl(makeRefreshTokenKey(newTokenPayload.id, newTokenPayload.jti));
            expect(newTokenTTLInRedis).toBe(oldTokenTTLSeconds);
        });

        // describe('Token is expired', () => {
        //     test('throw HttpError UNAUTHORIZED and invalid token message', async () => {
        //         const { userId } = await createUser(getRandomRole());

        //     });            
        // });

        describe('Token is not in redis database', () => {
            test('throw HttpError UNAUTHORIZED and invalid token message', async () => {
                // valid token but never saved in redis db
                const { userId } = await createUser(getRandomRole());
                const { token: invalidToken } = testKit.refreshJwt.generate('20m', {
                    id: userId
                });
                await expect(refreshTokenService.rotate(invalidToken))
                    .rejects
                    .toThrow(HttpError.unAuthorized(authErrors.INVALID_TOKEN));
            });
        });

        describe('Token is not signed by this server', () => {
            test('throw HttpError UNAUTHORIZED and invalid token message', async () => {
                const { userId } = await createUser(getRandomRole());
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
            const { userId } = await createUser(getRandomRole());
            const token = await refreshTokenService.generate(userId);
            const payload = testKit.refreshJwt.verify(token);
            expect(payload).toBeDefined();
            // revoke
            await refreshTokenService.revokeToken(payload!.id, payload!.jti);
            const tokenInRedis = await testKit.redisService.get(makeRefreshTokenKey(payload!.id, payload!.jti));
            expect(tokenInRedis).toBeNull();
        });
    });

    describe('revokeAllToken', () => {
        test('deleted all the tokens asocciated to user in redis database', async () => {
            // create 3 tokens for this user
            const { userId } = await createUser(getRandomRole());
            const token1 = await refreshTokenService.generate(userId);
            const token2 = await refreshTokenService.generate(userId);
            const token3 = await refreshTokenService.generate(userId);
            const token1Payload = testKit.refreshJwt.verify(token1)!;
            const token2Payload = testKit.refreshJwt.verify(token2)!;
            const token3Payload = testKit.refreshJwt.verify(token3)!;
            // revoke all refresh tokens
            await refreshTokenService.revokeAllTokens(userId);
            // tokens shouldn't exist in redis db
            await expect(testKit.redisService.get(makeRefreshTokenKey(token1Payload.id, token1Payload.jti))).resolves.toBeNull()
            await expect(testKit.redisService.get(makeRefreshTokenKey(token2Payload.id, token2Payload.jti))).resolves.toBeNull()
            await expect(testKit.redisService.get(makeRefreshTokenKey(token3Payload.id, token3Payload.jti))).resolves.toBeNull()
        });
    });
});

