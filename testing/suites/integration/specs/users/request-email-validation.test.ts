import { testKit } from '@integration/kit/test.kit';
import { createUser } from '@integration/utils/create-user.util';
import { status2xx } from '@integration/utils/status-2xx.util';
import * as nodemailer from 'nodemailer';
import { NodemailerMock } from 'nodemailer-mock';
import { UserRole } from 'src/enums/user-role.enum';
import { RateLimiter } from 'src/enums/rate-limiter.enum';
import { commonErrors } from 'src/messages/common.error.messages';
import { faker } from '@faker-js/faker';
import { statusCodes } from 'src/constants/status-codes.constants';
import { authErrors } from 'src/messages/auth.error.messages';
import { rateLimitingSettings } from 'src/settings/rate-limiting.settings';

const { mock } = nodemailer as unknown as NodemailerMock;

describe(`POST ${testKit.urls.requestEmailValidation}`, () => {
    describe('Session token not provided', () => {
        test(`return 401 status code and invalid token error message`, async () => {
            const { statusCode, body } = await testKit.agent.post(
                testKit.urls.requestEmailValidation,
            );
            expect(body).toStrictEqual({ error: authErrors.INVALID_TOKEN });
            expect(statusCode).toBe(statusCodes.UNAUTHORIZED);
        });
    });

    describe('User email is already verified', () => {
        test('return 409 status code and email already verified error message', async () => {
            const { sessionToken } = await createUser(UserRole.EDITOR);
            const response = await testKit.agent
                .post(testKit.urls.requestEmailValidation)
                .set('Authorization', `Bearer ${sessionToken}`);
            expect(response.body).toStrictEqual({ error: authErrors.EMAIL_ALREADY_VERIFIED });
            expect(response.statusCode).toBe(409);
        });
    });

    describe('Successful request', () => {
        test('email is sent to the user email address with a valid token for email validation', async () => {
            const { sessionToken, email } = await createUser(UserRole.READONLY);
            await testKit.agent
                .post(testKit.urls.requestEmailValidation)
                .set('Authorization', `Bearer ${sessionToken}`)
                .expect(status2xx);
            const sentEmails = mock.getSentMail();
            expect(sentEmails.length).toBe(1);
            expect(sentEmails[0].to).toBe(email);
            const html = sentEmails[0].html as string;
            const tokenMatch = html.match(/token=([^"]+)/);
            expect(tokenMatch).not.toBeNull();
            const token = tokenMatch![1];
            await expect(testKit.emailValidationTokenService.consume(token)).resolves.not.toThrow();
        });

        test('return 204 status code and no body', async () => {
            const { sessionToken } = await createUser(UserRole.READONLY);
            const response = await testKit.agent
                .post(testKit.urls.requestEmailValidation)
                .set('Authorization', `Bearer ${sessionToken}`)
                .expect(204);
            expect(response.body).toStrictEqual({});
        });
    });

    describe('Too many requests', () => {
        test('return 429 status code and too many requests error message', async () => {
            const ip = faker.internet.ip();
            const { sessionToken } = await createUser(UserRole.READONLY);
            for (let i = 0; i < rateLimitingSettings[RateLimiter.critical].max; i++) {
                await testKit.agent
                    .post(testKit.urls.requestEmailValidation)
                    .set('Authorization', `Bearer ${sessionToken}`)
                    .set('X-Forwarded-For', ip);
            }
            const response = await testKit.agent
                .post(testKit.urls.requestEmailValidation)
                .set('Authorization', `Bearer ${sessionToken}`)
                .set('X-Forwarded-For', ip);
            expect(response.body).toStrictEqual({ error: commonErrors.TOO_MANY_REQUESTS });
            expect(response.statusCode).toBe(statusCodes.TOO_MANY_REQUESTS);
        });
    });
});
