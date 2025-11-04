import request from 'supertest';
import { faker } from '@faker-js/faker/.';
import { JwtTypes } from 'src/enums/jwt-types.enum';
import { JwtService } from 'src/services/jwt.service';
import { testKit } from '@integration/utils/testKit.util';
import { status2xx } from '@integration/utils/status2xx.util';
import { createUser } from '@integration/utils/createUser.util';
import { usersLimits } from 'src/common/constants/user.constants';
import { getRandomRole } from '@test/tools/utilities/get-random-role.util';
import { authErrors } from 'src/common/errors/messages/auth.error.messages';
import { tokenPurposes } from 'src/common/constants/token-purposes.constants';
import { usersApiErrors } from 'src/common/errors/messages/users-api.error.messages';

describe('POST /api/user/reset-password', () => {
    describe('Successful password reset', () => {
        test('token should be blacklisted', async () => {
            const { userEmail } = await createUser(getRandomRole());
            // valid token
            const { token, jti } = testKit.passwordRecovJwt.generate('1m', {
                email: userEmail,
                purpose: tokenPurposes.PASSWORD_RECOVERY,
            });
            await request(testKit.server)
                .post(testKit.endpoints.resetPassword)
                .send({
                    token,
                    newPassword: testKit.userDataGenerator.password(),
                })
                .expect(status2xx);

            const tokenInRedisStore = await testKit.jwtBlacklistService.tokenInBlacklist(
                JwtTypes.passwordRecovery,
                jti,
            );
            expect(tokenInRedisStore).toBeTruthy();
        });

        test('user password should be hashed in database', async () => {
            const { userEmail, userId } = await createUser(getRandomRole());
            const newPassword = testKit.userDataGenerator.password();
            const { token } = testKit.passwordRecovJwt.generate('1m', {
                email: userEmail,
                purpose: tokenPurposes.PASSWORD_RECOVERY,
            });
            await request(testKit.server)
                .post(testKit.endpoints.resetPassword)
                .send({ token, newPassword })
                .expect(status2xx);
            const userInDb = await testKit.userModel.findById(userId).exec();
            expect(testKit.hashingService.compare(newPassword, userInDb!.password)).toBeTruthy();
        });
    });

    describe('User with email in token not found', () => {
        test('return status 404 USER_NOT_FOUND error message', async () => {
            const { token } = testKit.passwordRecovJwt.generate('1m', {
                email: testKit.userDataGenerator.email(),
                purpose: tokenPurposes.PASSWORD_RECOVERY,
            });
            const res = await request(testKit.server).post(testKit.endpoints.resetPassword).send({
                token,
                newPassword: testKit.userDataGenerator.password(),
            });
            expect(res.body).toStrictEqual({ error: usersApiErrors.USER_NOT_FOUND });
            expect(res.status).toBe(404);
        });
    });

    describe('Token not provided', () => {
        test('return status 400 and INVALID_TOKEN error message', async () => {
            const res = await request(testKit.server).post(testKit.endpoints.resetPassword).send({
                newPassword: testKit.userDataGenerator.password(),
            });
            expect(res.body).toStrictEqual({ error: authErrors.INVALID_TOKEN });
            expect(res.status).toBe(400);
        });
    });

    describe('Token not signed by this server', () => {
        test('return status 400 and INVALID_TOKEN error message', async () => {
            const { token: invalidToken } = new JwtService('randomKey').generate('10m', {});
            const res = await request(testKit.server).post(testKit.endpoints.resetPassword).send({
                token: invalidToken,
                newPassword: testKit.userDataGenerator.password(),
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
            const res = await request(testKit.server).post(testKit.endpoints.resetPassword).send({
                token: tokenWithWrongPurpose,
                newPassword: testKit.userDataGenerator.password(),
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
            const res = await request(testKit.server).post(testKit.endpoints.resetPassword).send({
                token: tokenWithNoEmail,
                newPassword: testKit.userDataGenerator.password(),
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

            // blacklist token
            await testKit.jwtBlacklistService.blacklist(JwtTypes.passwordRecovery, jti, 10000);

            const res = await request(testKit.server).post(testKit.endpoints.resetPassword).send({
                token: token,
                newPassword: testKit.userDataGenerator.password(),
            });
            expect(res.body).toStrictEqual({ error: authErrors.INVALID_TOKEN });
            expect(res.status).toBe(400);
        });
    });

    describe('Password length exceeds the max password length (wiring test)', () => {
        test('return status 400 and INVALID_PASSWORD_LENGTH error message', async () => {
            const badPassword = faker.internet.password({
                length: usersLimits.MAX_PASSWORD_LENGTH + 1,
            });
            const res = await request(testKit.server).post(testKit.endpoints.resetPassword).send({
                token: '123',
                newPassword: badPassword,
            });
            expect(res.body).toStrictEqual({ error: usersApiErrors.INVALID_PASSWORD_LENGTH });
            expect(res.status).toBe(400);
        });
    });
});
