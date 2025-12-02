import { faker } from '@faker-js/faker';
import { JwtTypes } from 'src/enums/jwt-types.enum';
import { JwtService } from 'src/services/jwt.service';
import { testKit } from '@integration/kit/test.kit';
import { createUser } from '@integration/utils/create-user.util';
import { getRandomRole } from '@test/tools/utilities/get-random-role.util';
import { tokenPurposes } from 'src/constants/token-purposes.constants';
import { status2xx } from '@integration/utils/status-2xx.util';
import { authErrors } from 'src/messages/auth.error.messages';
import { usersApiErrors } from 'src/messages/users-api.error.messages';
import { usersLimits } from 'src/constants/user.constants';
import { RateLimiter } from 'src/enums/rate-limiter.enum';
import { rateLimiting } from 'src/constants/rate-limiting.constants';
import { commonErrors } from 'src/messages/common.error.messages';
import { authSuccessMessages } from 'src/messages/auth.success.messages';
import { makeRefreshTokenKey } from 'src/functions/token/make-refresh-token-key';
import { makeRefreshTokenIndexKey } from 'src/functions/token/make-refresh-token-index-key';
import { makePasswordRecoveryTokenBlacklistKey } from 'src/functions/token/make-password-recovery-token-blacklist-key';
import { stringValueToSeconds } from '@integration/utils/string-value-to-seconds.util';

describe(`POST ${testKit.urls.resetPassword}`, () => {
    describe('Successful password resetting', () => {
        test('token is blacklisted for the remaining ttl in redis', async () => {
            const { email } = await createUser(getRandomRole());
            const { token, jti } = testKit.passwordRecoveryTokenService.generate(email, {
                meta: true,
            });
            await testKit.agent
                .post(testKit.urls.resetPassword)
                .send({
                    newPassword: testKit.userData.password,
                    token,
                })
                .expect(status2xx);
            const redisKey = makePasswordRecoveryTokenBlacklistKey(jti);
            const tokenInRedis = await testKit.redisService.get(redisKey);
            const ttlSeconds = await testKit.redisService.getTtl(redisKey);
            const expectedTtlSeconds = stringValueToSeconds(
                testKit.configService.JWT_PASSWORD_RECOVERY_EXP_TIME,
            );
            expect(tokenInRedis).toBe(1);
            expect(ttlSeconds).toBeGreaterThanOrEqual(expectedTtlSeconds - 2);
            expect(ttlSeconds).toBeLessThanOrEqual(expectedTtlSeconds);
        });

        test('all refresh token associated with user are deleted from redis', async () => {
            // register (token 1)
            const {
                refreshToken: refreshTkn1,
                email,
                unhashedPassword,
                id,
            } = await createUser(getRandomRole());
            // login (token 2)
            const { body } = await testKit.agent
                .post(testKit.urls.login)
                .send({ email, password: unhashedPassword })
                .expect(status2xx);
            const refreshTkn2 = body.refreshToken;
            // reset password
            const token = testKit.passwordRecoveryTokenService.generate(email);
            await testKit.agent
                .post(testKit.urls.resetPassword)
                .send({
                    newPassword: testKit.userData.password,
                    token,
                })
                .expect(status2xx);
            // get jtis
            const { jti: tkn1Jti } = testKit.refreshJwt.verify(refreshTkn1)!;
            const { jti: tkn2Jti } = testKit.refreshJwt.verify(refreshTkn2)!;
            const tkn1InRedis = await testKit.redisService.get(makeRefreshTokenKey(id, tkn1Jti));
            const tkn2InRedis = await testKit.redisService.get(makeRefreshTokenKey(id, tkn2Jti));
            expect(tkn1InRedis).toBeNull();
            expect(tkn2InRedis).toBeNull();
        });

        test('clear user refresh token index in Redis', async () => {
            // register (token 1)
            const { email, unhashedPassword, id } = await createUser(getRandomRole());
            const indexKey = makeRefreshTokenIndexKey(id);
            // login (token 2)
            await testKit.agent
                .post(testKit.urls.login)
                .send({ email, password: unhashedPassword })
                .expect(status2xx);
            // index size should be 2
            await expect(testKit.redisService.getListSize(indexKey)).resolves.toBe(2);
            // reset password
            const token = testKit.passwordRecoveryTokenService.generate(email);
            await testKit.agent
                .post(testKit.urls.resetPassword)
                .send({
                    newPassword: testKit.userData.password,
                    token,
                })
                .expect(status2xx);
            // index size should be 0
            const indexSize = await testKit.redisService.getListSize(indexKey);
            expect(indexSize).toBe(0);
        });

        test('user password is hashed in database', async () => {
            const { email, id } = await createUser(getRandomRole());
            const newPassword = testKit.userData.password;
            const token = testKit.passwordRecoveryTokenService.generate(email);
            await testKit.agent
                .post(testKit.urls.resetPassword)
                .send({ token, newPassword })
                .expect(status2xx);
            const userInDb = await testKit.models.user.findById(id).exec();
            const isHashed = await testKit.hashingService.compare(newPassword, userInDb!.password);
            expect(isHashed).toBeTruthy();
        });

        test('return status 200 and password reset success plain text', async () => {
            const { email } = await createUser(getRandomRole());
            const token = testKit.passwordRecoveryTokenService.generate(email);
            const res = await testKit.agent
                .post(testKit.urls.resetPassword)
                .send({ token, newPassword: testKit.userData.password })
                .expect(200);
            expect(res.body).toStrictEqual({ message: authSuccessMessages.PASSWORD_RESET_SUCCESS });
        });
    });

    describe('User with email in token not found', () => {
        test('return status 401 and invalid token error message', async () => {
            const token = testKit.passwordRecoveryTokenService.generate(testKit.userData.email);
            const res = await testKit.agent.post(testKit.urls.resetPassword).send({
                token,
                newPassword: testKit.userData.password,
            });
            expect(res.body).toStrictEqual({ error: authErrors.INVALID_TOKEN });
            expect(res.status).toBe(401);
        });
    });

    describe('Token not provided', () => {
        test('return status 400 and invalid token error message', async () => {
            const res = await testKit.agent.post(testKit.urls.resetPassword).send({
                newPassword: testKit.userData.password,
            });
            expect(res.body).toStrictEqual({ error: authErrors.INVALID_TOKEN });
            expect(res.status).toBe(400);
        });
    });

    describe('Token not signed by this server', () => {
        test('return status 401 and invalid token error message', async () => {
            const randomEmail = testKit.userData.email;
            const { token: invalidToken } = new JwtService('randomKey').generate('10m', {
                email: randomEmail,
                purpose: tokenPurposes.PASSWORD_RECOVERY,
            });
            const res = await testKit.agent.post(testKit.urls.resetPassword).send({
                token: invalidToken,
                newPassword: testKit.userData.password,
            });
            expect(res.body).toStrictEqual({ error: authErrors.INVALID_TOKEN });
            expect(res.status).toBe(401);
        });
    });

    describe('Invalid token purpose', () => {
        test('return status 401 and invalid token error message', async () => {
            const { email } = await createUser();
            const badToken = testKit.emailValidationTokenService.generate(email);
            const res = await testKit.agent.post(testKit.urls.resetPassword).send({
                token: badToken,
                newPassword: testKit.userData.password,
            });
            expect(res.body).toStrictEqual({ error: authErrors.INVALID_TOKEN });
            expect(res.status).toBe(401);
        });
    });

    describe('Token is blacklisted', () => {
        test('return status 401 and invalid token error message', async () => {
            const { token, jti } = testKit.passwordRecoveryTokenService.generate(
                testKit.userData.email,
                { meta: true },
            );
            await testKit.jwtBlacklistService.blacklist(JwtTypes.passwordRecovery, jti, 10000);
            const res = await testKit.agent.post(testKit.urls.resetPassword).send({
                token,
                newPassword: testKit.userData.password,
            });
            expect(res.body).toStrictEqual({ error: authErrors.INVALID_TOKEN });
            expect(res.status).toBe(401);
        });
    });

    describe('Password length exceeds the max password length', () => {
        test('return status 400 and invalid password length error message', async () => {
            const { email } = await createUser(getRandomRole());
            const token = testKit.passwordRecoveryTokenService.generate(email);
            const res = await testKit.agent.post(testKit.urls.resetPassword).send({
                token,
                newPassword: faker.internet.password({
                    length: usersLimits.MAX_PASSWORD_LENGTH + 1,
                }),
            });
            expect(res.body).toStrictEqual({ error: usersApiErrors.INVALID_PASSWORD_LENGTH });
            expect(res.status).toBe(400);
        });
    });

    describe('Password length is too short', () => {
        test('return status 400 and invalid password length error message', async () => {
            const { email } = await createUser(getRandomRole());
            const token = testKit.passwordRecoveryTokenService.generate(email);
            const res = await testKit.agent.post(testKit.urls.resetPassword).send({
                token,
                newPassword: faker.internet.password({
                    length: usersLimits.MIN_PASSWORD_LENGTH - 1,
                }),
            });
            expect(res.body).toStrictEqual({ error: usersApiErrors.INVALID_PASSWORD_LENGTH });
            expect(res.status).toBe(400);
        });
    });

    describe('Too many requests', () => {
        test('return 429 status code and too many requests error message', async () => {
            const ip = faker.internet.ip();
            const { email } = await createUser(getRandomRole());
            const token = testKit.passwordRecoveryTokenService.generate(email);
            for (let i = 0; i < rateLimiting[RateLimiter.critical].max; i++) {
                await testKit.agent
                    .post(testKit.urls.resetPassword)
                    .set('X-Forwarded-For', ip)
                    .send({
                        token,
                        newPassword: testKit.userData.password,
                    });
            }
            const res = await testKit.agent
                .post(testKit.urls.resetPassword)
                .set('X-Forwarded-For', ip)
                .send({
                    token,
                    newPassword: testKit.userData.password,
                });
            expect(res.status).toBe(429);
            expect(res.body).toStrictEqual({ error: commonErrors.TOO_MANY_REQUESTS });
        });
    });
});
