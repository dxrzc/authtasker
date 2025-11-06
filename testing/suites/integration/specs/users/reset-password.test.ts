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

const resetPasswordUrl = testKit.urls.resetPassword;

describe(`POST ${resetPasswordUrl}`, () => {
    describe('Successful', () => {
        test('token should be blacklisted', async () => {
            const { email } = await createUser(getRandomRole());
            const { token, jti } = testKit.passwordRecovJwt.generate('1m', {
                purpose: tokenPurposes.PASSWORD_RECOVERY,
                email,
            });
            await testKit.agent
                .post(resetPasswordUrl)
                .send({
                    token,
                    newPassword: testKit.userData.password,
                })
                .expect(status2xx);
            const tokenInRedisStore = await testKit.jwtBlacklistService.tokenInBlacklist(
                JwtTypes.passwordRecovery,
                jti,
            );
            expect(tokenInRedisStore).toBeTruthy();
        });
    });

    describe('Successful', () => {
        test('user password should be hashed in database', async () => {
            const { email, userId } = await createUser(getRandomRole());
            const newPassword = testKit.userData.password;
            const { token } = testKit.passwordRecovJwt.generate('1m', {
                email,
                purpose: tokenPurposes.PASSWORD_RECOVERY,
            });
            await testKit.agent
                .post(resetPasswordUrl)
                .send({ token, newPassword })
                .expect(status2xx);
            const userInDb = await testKit.models.user.findById(userId).exec();
            expect(testKit.hashingService.compare(newPassword, userInDb!.password)).toBeTruthy();
        });
    });

    describe('User with email in token not found', () => {
        test('return status 404 USER_NOT_FOUND error message', async () => {
            const { token } = testKit.passwordRecovJwt.generate('1m', {
                email: testKit.userData.email,
                purpose: tokenPurposes.PASSWORD_RECOVERY,
            });
            const res = await testKit.agent.post(resetPasswordUrl).send({
                token,
                newPassword: testKit.userData.password,
            });
            expect(res.body).toStrictEqual({ error: usersApiErrors.NOT_FOUND });
            expect(res.status).toBe(404);
        });
    });

    describe('Token not provided', () => {
        test('return status 400 and INVALID_TOKEN error message', async () => {
            const res = await testKit.agent.post(resetPasswordUrl).send({
                newPassword: testKit.userData.password,
            });
            expect(res.body).toStrictEqual({ error: authErrors.INVALID_TOKEN });
            expect(res.status).toBe(400);
        });
    });

    describe('Token not signed by this server', () => {
        test('return status 400 and INVALID_TOKEN error message', async () => {
            const randomEmail = testKit.userData.email;
            const { token: invalidToken } = new JwtService('randomKey').generate('10m', {
                email: randomEmail,
                purpose: tokenPurposes.PASSWORD_RECOVERY,
            });
            const res = await testKit.agent.post(resetPasswordUrl).send({
                token: invalidToken,
                newPassword: testKit.userData.password,
            });
            expect(res.body).toStrictEqual({ error: authErrors.INVALID_TOKEN });
            expect(res.status).toBe(400);
        });
    });

    describe('Invalid token purpose', () => {
        test('return status 400 and INVALID_TOKEN error message', async () => {
            const { token: tokenWithWrongPurpose } = testKit.passwordRecovJwt.generate('1m', {
                email: 'test@gmail.com',
                purpose: tokenPurposes.SESSION,
            });
            const res = await testKit.agent.post(resetPasswordUrl).send({
                token: tokenWithWrongPurpose,
                newPassword: testKit.userData.password,
            });
            expect(res.body).toStrictEqual({ error: authErrors.INVALID_TOKEN });
            expect(res.status).toBe(400);
        });
    });

    describe('Email not in token', () => {
        test('return status 400 and INVALID_TOKEN error message', async () => {
            const { token: tokenWithNoEmail } = testKit.passwordRecovJwt.generate('1m', {
                purpose: tokenPurposes.PASSWORD_RECOVERY,
            });
            const res = await testKit.agent.post(resetPasswordUrl).send({
                token: tokenWithNoEmail,
                newPassword: testKit.userData.password,
            });
            expect(res.body).toStrictEqual({ error: authErrors.INVALID_TOKEN });
            expect(res.status).toBe(400);
        });
    });

    describe('Correct token but blacklisted', () => {
        test('return status 400 and INVALID_TOKEN error message', async () => {
            const { token, jti } = testKit.passwordRecovJwt.generate('1m', {
                email: 'test@gmail.com',
                purpose: tokenPurposes.PASSWORD_RECOVERY,
            });
            await testKit.jwtBlacklistService.blacklist(JwtTypes.passwordRecovery, jti, 10000);
            const res = await testKit.agent.post(resetPasswordUrl).send({
                token,
                newPassword: testKit.userData.password,
            });
            expect(res.body).toStrictEqual({ error: authErrors.INVALID_TOKEN });
            expect(res.status).toBe(400);
        });
    });

    describe('Password length exceeds the max password length', () => {
        test('return status 400 and INVALID_PASSWORD_LENGTH error message', async () => {
            const { email } = await createUser(getRandomRole());
            const { token } = testKit.passwordRecovJwt.generate('1m', {
                email,
                purpose: tokenPurposes.PASSWORD_RECOVERY,
            });
            const res = await testKit.agent.post(resetPasswordUrl).send({
                token,
                newPassword: faker.internet.password({
                    length: usersLimits.MAX_PASSWORD_LENGTH + 1,
                }),
            });
            expect(res.body).toStrictEqual({ error: usersApiErrors.INVALID_PASSWORD_LENGTH });
            expect(res.status).toBe(400);
        });
    });

    describe(`More than ${rateLimiting[RateLimiter.critical].max} requests in ${rateLimiting[RateLimiter.critical].windowMs / 1000}s`, () => {
        test('should return 429 status code and TOO_MANY_REQUESTS message', async () => {
            const ip = faker.internet.ip();
            const { email } = await createUser(getRandomRole());
            const { token } = testKit.passwordRecovJwt.generate('1m', {
                email,
                purpose: tokenPurposes.PASSWORD_RECOVERY,
            });
            for (let i = 0; i < rateLimiting[RateLimiter.critical].max; i++) {
                await testKit.agent.post(resetPasswordUrl).set('X-Forwarded-For', ip).send({
                    token,
                    newPassword: testKit.userData.password,
                });
            }
            const res = await testKit.agent.post(resetPasswordUrl).set('X-Forwarded-For', ip).send({
                token,
                newPassword: testKit.userData.password,
            });
            expect(res.status).toBe(429);
            expect(res.body).toStrictEqual({ error: commonErrors.TOO_MANY_REQUESTS });
        });
    });
});
