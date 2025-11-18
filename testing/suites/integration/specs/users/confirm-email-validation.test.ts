import { faker } from '@faker-js/faker/.';
import { testKit } from '@integration/kit/test.kit';
import { createUser } from '@integration/utils/create-user.util';
import { status2xx } from '@integration/utils/status-2xx.util';
import { stringValueToSeconds } from '@integration/utils/string-value-to-seconds.util';
import { rateLimiting } from 'src/constants/rate-limiting.constants';
import { statusCodes } from 'src/constants/status-codes.constants';
import { tokenPurposes } from 'src/constants/token-purposes.constants';
import { JwtTypes } from 'src/enums/jwt-types.enum';
import { RateLimiter } from 'src/enums/rate-limiter.enum';
import { UserRole } from 'src/enums/user-role.enum';
import { makeEmailValidationBlacklistKey } from 'src/functions/token/make-email-validation-token-blacklist-key';
import { authErrors } from 'src/messages/auth.error.messages';
import { authSuccessMessages } from 'src/messages/auth.success.messages';
import { commonErrors } from 'src/messages/common.error.messages';
import { JwtService } from 'src/services/jwt.service';

describe(`POST ${testKit.urls.confirmEmailValidation}`, () => {
    describe('Succesful email validation', () => {
        test('update user role to editor', async () => {
            const { id, email } = await createUser();
            const token = testKit.emailValidationTokenService.generate(email);
            await testKit.agent
                .get(`${testKit.urls.confirmEmailValidation}?token=${token}`)
                .expect(status2xx);
            const userInDb = await testKit.models.user.findById(id).exec();
            expect(userInDb?.role).toBe(UserRole.EDITOR);
        });

        test('update emailValidated property to true in db', async () => {
            const { id, email } = await createUser();
            const token = testKit.emailValidationTokenService.generate(email);
            await testKit.agent
                .get(`${testKit.urls.confirmEmailValidation}?token=${token}`)
                .expect(status2xx);
            const userInDb = await testKit.models.user.findById(id).exec();
            expect(userInDb?.emailValidated).toBeTruthy();
        });

        test('token is blacklisted for the remaining ttl in redis', async () => {
            const { email } = await createUser();
            const { token, jti } = testKit.emailValidationTokenService.generate(email, {
                meta: true,
            });
            await testKit.agent.get(`${testKit.urls.confirmEmailValidation}?token=${token}`);
            const redisKey = makeEmailValidationBlacklistKey(jti);
            const tokenInRedis = await testKit.redisService.get(redisKey);
            const ttlSeconds = await testKit.redisService.getTtl(redisKey);
            const expectedTtlSeconds = stringValueToSeconds(
                testKit.configService.JWT_EMAIL_VALIDATION_EXP_TIME,
            );
            expect(tokenInRedis).toBe(1);
            expect(ttlSeconds).toBeGreaterThanOrEqual(expectedTtlSeconds - 2);
            expect(ttlSeconds).toBeLessThanOrEqual(expectedTtlSeconds);
        });

        test('return 200 status code and success message email validated succesfully message', async () => {
            const { email } = await createUser();
            const token = testKit.emailValidationTokenService.generate(email);
            const res = await testKit.agent
                .get(`${testKit.urls.confirmEmailValidation}?token=${token}`)
                .expect(status2xx);
            expect(res.body).toStrictEqual({
                message: authSuccessMessages.EMAIL_VALIDATED_SUCCESSFULLY,
            });
        });
    });

    describe('Email is already validated', () => {
        test('return 409 status code and email is already verified error message', async () => {
            const { id, email } = await createUser();
            const token = testKit.emailValidationTokenService.generate(email);
            await testKit.models.user.findByIdAndUpdate(id, { emailValidated: true }).exec();
            const res = await testKit.agent.get(
                `${testKit.urls.confirmEmailValidation}?token=${token}`,
            );
            expect(res.body).toStrictEqual({ error: authErrors.EMAIL_ALREADY_VERIFIED });
            expect(res.status).toBe(409);
        });
    });

    describe('User role is already editor but email is not validated', () => {
        test('update emailValidated property to true in db', async () => {
            const { id, email } = await createUser();
            await testKit.models.user.findByIdAndUpdate(id, { role: UserRole.EDITOR }).exec();
            const token = testKit.emailValidationTokenService.generate(email);
            await testKit.agent
                .get(`${testKit.urls.confirmEmailValidation}?token=${token}`)
                .expect(status2xx);
            const userInDb = await testKit.models.user.findById(id).exec();
            expect(userInDb?.emailValidated).toBeTruthy();
        });
    });

    describe('Token not provided', () => {
        test('return 400 status code and invalid token error message', async () => {
            const res = await testKit.agent.get(`${testKit.urls.confirmEmailValidation}`);
            expect(res.body).toStrictEqual({ error: authErrors.INVALID_TOKEN });
            expect(res.status).toBe(statusCodes.BAD_REQUEST);
        });
    });

    describe('Token purpose is not valid', () => {
        test('return 401 status code and invalid token error message', async () => {
            const { email } = await createUser();
            const token = testKit.passwordRecoveryTokenService.generate(email);
            const res = await testKit.agent.get(
                `${testKit.urls.confirmEmailValidation}?token=${token}`,
            );
            expect(res.body).toStrictEqual({ error: authErrors.INVALID_TOKEN });
            expect(res.status).toBe(statusCodes.UNAUTHORIZED);
        });
    });

    describe('Token not signed by this server', () => {
        test('return 401 status code and invalid token error message', async () => {
            const { token: badToken } = new JwtService('randomKey').generate('10m', {
                purpose: tokenPurposes.EMAIL_VALIDATION,
                email: testKit.userData.email,
            });
            const res = await testKit.agent.get(
                `${testKit.urls.confirmEmailValidation}?token=${badToken}`,
            );
            expect(res.body).toStrictEqual({ error: authErrors.INVALID_TOKEN });
            expect(res.status).toBe(statusCodes.UNAUTHORIZED);
        });
    });

    describe('Token is blacklisted', () => {
        test('return 401 status code and invalid token error message', async () => {
            const { email } = await createUser();
            const { token, jti } = testKit.emailValidationTokenService.generate(email, {
                meta: true,
            });
            await testKit.jwtBlacklistService.blacklist(JwtTypes.emailValidation, jti, 1000);
            const res = await testKit.agent.get(
                `${testKit.urls.confirmEmailValidation}?token=${token}`,
            );
            expect(res.body).toStrictEqual({ error: authErrors.INVALID_TOKEN });
            expect(res.status).toBe(statusCodes.UNAUTHORIZED);
        });
    });

    describe('User in token does not exist', () => {
        test('return 401 status code and invalid token error message', async () => {
            const token = testKit.emailValidationTokenService.generate(testKit.userData.email);
            const { body, status } = await testKit.agent.get(
                `${testKit.urls.confirmEmailValidation}?token=${token}`,
            );
            expect(body).toStrictEqual({ error: authErrors.INVALID_TOKEN });
            expect(status).toBe(statusCodes.UNAUTHORIZED);
        });
    });

    describe('Too many requests', () => {
        test('return 429 status code and too many requests error message', async () => {
            const ip = faker.internet.ip();
            for (let i = 0; i < rateLimiting[RateLimiter.critical].max; i++) {
                await testKit.agent
                    .get(`${testKit.urls.confirmEmailValidation}?token=badToke1n`)
                    .set('X-Forwarded-For', ip);
            }
            const res = await testKit.agent
                .get(`${testKit.urls.confirmEmailValidation}?token=badToke1n`)
                .set('X-Forwarded-For', ip);
            expect(res.body).toStrictEqual({ error: commonErrors.TOO_MANY_REQUESTS });
            expect(res.status).toBe(429);
        });
    });
});
