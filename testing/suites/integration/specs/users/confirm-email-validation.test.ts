import { faker } from '@faker-js/faker/.';
import { testKit } from '@integration/kit/test.kit';
import { createUser } from '@integration/utils/create-user.util';
import { status2xx } from '@integration/utils/status-2xx.util';
import { Types } from 'mongoose';
import { rateLimiting } from 'src/constants/rate-limiting.constants';
import { tokenPurposes } from 'src/constants/token-purposes.constants';
import { JwtTypes } from 'src/enums/jwt-types.enum';
import { RateLimiter } from 'src/enums/rate-limiter.enum';
import { UserRole } from 'src/enums/user-role.enum';
import { authErrors } from 'src/messages/auth.error.messages';
import { authSuccessMessages } from 'src/messages/auth.success.messages';
import { commonErrors } from 'src/messages/common.error.messages';
import { JwtService } from 'src/services/jwt.service';

describe(`POST ${testKit.urls.confirmEmailValidation}/:token`, () => {
    describe('Succesful email validation', () => {
        test('update user role to editor', async () => {
            const { id } = await createUser();
            const { token } = testKit.emailValidationJwt.generate('1m', { id });
            await testKit.agent
                .post(`${testKit.urls.confirmEmailValidation}/:${token}`)
                .expect(status2xx);
            const userInDb = await testKit.models.user.findById(id).exec();
            expect(userInDb?.role).toBe(UserRole.EDITOR);
        });

        test('update emailValidated property to true in db', async () => {
            const { id } = await createUser();
            const { token } = testKit.emailValidationJwt.generate('1m', { id });
            await testKit.agent
                .post(`${testKit.urls.confirmEmailValidation}/:${token}`)
                .expect(status2xx);
            const userInDb = await testKit.models.user.findById(id).exec();
            expect(userInDb?.emailValidated).toBeTruthy();
        });

        test('return 200 status code and success message email validated succesfully message', async () => {
            const { id } = await createUser();
            const { token } = testKit.emailValidationJwt.generate('1m', { id });
            const res = await testKit.agent
                .post(`${testKit.urls.confirmEmailValidation}/:${token}`)
                .expect(status2xx);
            expect(res.body).toStrictEqual({
                message: authSuccessMessages.EMAIL_VALIDATED_SUCCESSFULLY,
            });
        });
    });

    describe('Email is already validated', () => {
        test('return 200 status code and email is already verified message', async () => {
            const { id } = await createUser();
            const { token } = testKit.emailValidationJwt.generate('1m', { id });
            await testKit.models.user.findByIdAndUpdate(id, { emailValidated: true }).exec();
            await testKit.agent
                .post(`${testKit.urls.confirmEmailValidation}/:${token}`)
                .expect(status2xx);
            const res = await testKit.agent
                .post(`${testKit.urls.confirmEmailValidation}/:${token}`)
                .expect(status2xx);
            expect(res.body).toStrictEqual({
                message: authSuccessMessages.EMAIL_IS_ALREADY_VERIFIED,
            });
        });
    });

    describe('User role is already editor but email is not validated', () => {
        test('update emailValidated property to true in db', async () => {
            const { id } = await createUser(UserRole.EDITOR);
            const { token } = testKit.emailValidationJwt.generate('1m', { id });
            await testKit.agent
                .post(`${testKit.urls.confirmEmailValidation}/:${token}`)
                .expect(status2xx);
            const userInDb = await testKit.models.user.findById(id).exec();
            expect(userInDb?.emailValidated).toBeTruthy();
        });
    });

    describe('Token not provided', () => {
        test('return 401 status code and invalid token error message', async () => {
            const res = await testKit.agent
                .post(`${testKit.urls.confirmEmailValidation}/:`)
                .expect(401);
            expect(res.body).toStrictEqual({ error: authErrors.INVALID_TOKEN });
        });
    });

    describe('Token purpose is not valid', () => {
        test('return 401 status code and invalid token error message', async () => {
            const { token: badToken } = testKit.passwordRecovJwt.generate('1m', {
                email: 'test@gmail.com',
                purpose: tokenPurposes.PASSWORD_RECOVERY, // bad purpose
            });
            const res = await testKit.agent
                .post(`${testKit.urls.confirmEmailValidation}/:${badToken}`)
                .expect(401);
            expect(res.body).toStrictEqual({ error: authErrors.INVALID_TOKEN });
        });
    });

    describe('Token not signed by this servr', () => {
        test('return 401 status code and invalid token error message', async () => {
            const { token: badToken } = new JwtService('randomKey').generate('10m', {
                purpose: tokenPurposes.EMAIL_VALIDATION,
                email: testKit.userData.email,
            });
            const res = await testKit.agent
                .post(`${testKit.urls.confirmEmailValidation}/:${badToken}`)
                .expect(401);
            expect(res.body).toStrictEqual({ error: authErrors.INVALID_TOKEN });
        });
    });

    describe('Token is blacklisted', () => {
        test('return 401 status code and invalid token error message', async () => {
            const { token: badToken, jti } = testKit.emailValidationJwt.generate('1m', {
                email: testKit.userData.email,
                purpose: tokenPurposes.EMAIL_VALIDATION,
            });
            await testKit.jwtBlacklistService.blacklist(JwtTypes.emailValidation, jti, 10000);
            const res = await testKit.agent
                .post(`${testKit.urls.confirmEmailValidation}/:${badToken}`)
                .expect(401);
            expect(res.body).toStrictEqual({ error: authErrors.INVALID_TOKEN });
        });
    });

    describe('User in token does not exist', () => {
        test('return 401 status code and invalid token error message', async () => {
            const { token } = testKit.emailValidationJwt.generate('1m', {
                id: new Types.ObjectId().toString(),
                purpose: tokenPurposes.EMAIL_VALIDATION,
            });
            const res = await testKit.agent
                .post(`${testKit.urls.confirmEmailValidation}/:${token}`)
                .expect(401);
            expect(res.body).toStrictEqual({ error: authErrors.INVALID_TOKEN });
        });
    });

    describe('Too many requests', () => {
        test('return 429 status code and too many requests error message', async () => {
            const ip = faker.internet.ip();
            for (let i = 0; i < rateLimiting[RateLimiter.critical].max; i++) {
                await testKit.agent
                    .post(`${testKit.urls.confirmEmailValidation}/:badToken`)
                    .set('X-Forwarded-For', ip);
            }
            const res = await testKit.agent
                .post(`${testKit.urls.confirmEmailValidation}/:badToken`)
                .set('X-Forwarded-For', ip)
                .expect(429);
            expect(res.body).toStrictEqual({ error: commonErrors.TOO_MANY_REQUESTS });
        });
    });
});
