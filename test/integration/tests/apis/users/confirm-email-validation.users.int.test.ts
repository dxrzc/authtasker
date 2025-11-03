import request from 'supertest';
import * as nodemailer from "nodemailer";
import { NodemailerMock } from "nodemailer-mock";
import { JwtTypes } from 'src/enums/jwt-types.enum';
import { JwtService } from 'src/services/jwt.service';
import { testKit } from '@integration/utils/testKit.util';
import { status2xx } from '@integration/utils/status2xx.util';
import { createUser } from '@integration/utils/createUser.util';
import { getTokenFromMail } from '@integration/utils/getTokenFromMail.util';
import { authErrors } from 'src/common/errors/messages/auth.error.messages';
import { tokenPurposes } from 'src/common/constants/token-purposes.constants';
import { usersApiErrors } from 'src/common/errors/messages/users-api.error.messages';

// https://github.com/doublesharp/nodemailer-mock?tab=readme-ov-file#example-using-jest
const { mock } = nodemailer as unknown as NodemailerMock;

describe('POST /api/users/confirmEmailValidation/:token', () => {
    describe('Token', () => {
        test('return status 400 BAD REQUEST if token purpose is not valid', async () => {
            const expectedStatus = 400;
            const expectedErrorMssg = authErrors.INVALID_TOKEN;

            // generate token
            const { userEmail } = await createUser('admin');
            const { token: emailValidationToken } = testKit.emailValidationJwt.generate('10m', {
                purpose: tokenPurposes.SESSION,
                email: userEmail,
            });

            // Confirm email validation using an invalid token
            const response = await request(testKit.server)
                .get(`${testKit.endpoints.confirmEmailValidation}/${emailValidationToken}`);

            expect(response.body).toStrictEqual({ error: expectedErrorMssg });
            expect(response.statusCode).toBe(expectedStatus);
        });

        test('return status 400 BAD REQUEST if token is not signed by this server', async () => {
            const expectedStatus = 400;
            const expectedErrorMssg = authErrors.INVALID_TOKEN;

            // generate token
            const { userEmail } = await createUser('admin');
            const {token: emailValidationToken} = new JwtService('_').generate('10m', {
                purpose: tokenPurposes.EMAIL_VALIDATION,
                email: userEmail,
            });

            // confirm email validation using a strange token
            const response = await request(testKit.server)
                .get(`${testKit.endpoints.confirmEmailValidation}/${emailValidationToken}`);

            expect(response.body).toStrictEqual({ error: expectedErrorMssg });
            expect(response.statusCode).toBe(expectedStatus);
        });

        test('return status 400 BAD REQUEST if token is blacklisted', async () => {
            const expectedStatus = 400;
            const expectedErrorMssg = authErrors.INVALID_TOKEN;

            // generate token
            const { userEmail } = await createUser('editor');
            const { token: emailValidationToken } = testKit.emailValidationJwt.generate('10m', {
                purpose: tokenPurposes.EMAIL_VALIDATION,
                email: userEmail,
            });
            const jti = testKit.emailValidationJwt.verify(emailValidationToken)?.jti!;
            expect(jti).not.toBeNull();

            // blacklist token
            await testKit.jwtBlacklistService.blacklist(JwtTypes.emailValidation, jti, 10000);

            // confirm email validation using a blacklisted token
            const response = await request(testKit.server)
                .get(`${testKit.endpoints.confirmEmailValidation}/${emailValidationToken}`);

            expect(response.body).toStrictEqual({ error: expectedErrorMssg });
            expect(response.statusCode).toBe(expectedStatus);
        });
    });

    describe('Database Operations', () => {
        test('update user role to editor and emailValidated to true', async () => {
            const { sessionToken, userId } = await createUser('readonly');

            // Request email validation
            await request(testKit.server)
                .post(testKit.endpoints.requestEmailValidation)
                .set('Authorization', `Bearer ${sessionToken}`)
                .expect(status2xx);

            // Obtain token sent in url
            const tokenInEmail = getTokenFromMail(mock.getSentMail().at(0)?.html as string);

            // Confirm email validation
            await request(testKit.server)
                .get(`${testKit.endpoints.confirmEmailValidation}/${tokenInEmail}`)
                .expect(status2xx);

            const userInDb = await testKit.userModel.findById(userId);
            expect(userInDb!.role).toBe('editor');
            expect(userInDb!.emailValidated).toBeTruthy();
        });

        test('throw status 404 NOT FOUND if user in token does not exist', async () => {
            const expectedStatus = 404;
            const expectedErrorMssg = usersApiErrors.USER_NOT_FOUND;

            // Request email validation
            const { sessionToken, userId } = await createUser('readonly');
            await request(testKit.server)
                .post(testKit.endpoints.requestEmailValidation)
                .set('Authorization', `Bearer ${sessionToken}`)
                .expect(status2xx);

            // Obtain token sent in url
            const tokenInEmail = getTokenFromMail(mock.getSentMail().at(0)?.html as string);

            // delete user
            await testKit.userModel.findByIdAndDelete(userId);

            // Confirm email validation
            const response = await request(testKit.server)
                .get(`${testKit.endpoints.confirmEmailValidation}/${tokenInEmail}`);

            expect(response.body).toStrictEqual({ error: expectedErrorMssg });
            expect(response.statusCode).toBe(expectedStatus);
        });

        test('blacklist token provided in url', async () => {
            const { sessionToken } = await createUser('readonly');

            // Request email validation
            await request(testKit.server)
                .post(testKit.endpoints.requestEmailValidation)
                .set('Authorization', `Bearer ${sessionToken}`)
                .expect(status2xx);

            // Obtain token sent in url
            const tokenInEmail = getTokenFromMail(mock.getSentMail().at(0)?.html as string);
            const payload = testKit.emailValidationJwt.verify(tokenInEmail);
            const jti = payload!.jti;

            // Confirm email validation
            await request(testKit.server)
                .get(`${testKit.endpoints.confirmEmailValidation}/${tokenInEmail}`)
                .expect(status2xx);

            // expect token in blacklist
            const blacklistedToken = await testKit.jwtBlacklistService.tokenInBlacklist(JwtTypes.emailValidation, jti)
            expect(blacklistedToken).toBeDefined();
        });
    });

    describe('Response', () => {
        test('return status 200 OK', async () => {
            const expectedStatus = 200;

            const { sessionToken } = await createUser('readonly');

            // Request email validation
            await request(testKit.server)
                .post(testKit.endpoints.requestEmailValidation)
                .set('Authorization', `Bearer ${sessionToken}`)
                .expect(status2xx);

            // Obtain token sent in url
            const tokenInEmail = getTokenFromMail(mock.getSentMail().at(0)?.html as string);

            // Confirm email validation
            const response = await request(testKit.server)
                .get(`${testKit.endpoints.confirmEmailValidation}/${tokenInEmail}`)

            expect(response.body).toStrictEqual({ message: expect.any(String) });
            expect(response.statusCode).toBe(expectedStatus);
        });
    });
});