import request from 'supertest';
import * as nodemailer from "nodemailer";
import { NodemailerMock } from "nodemailer-mock";
import { testKit } from '@integration/utils/testKit.util';
import { status2xx } from '@integration/utils/status2xx.util';
import { createUser } from '@integration/utils/createUser.util';
import { getRandomRole } from '@integration/utils/get-random-role.util';
import { usersApiErrors } from 'src/common/errors/messages/users-api.error.messages';
import { extractTokenFromResetPasswordLink } from '@integration/utils/extract-token-from-reset-password-link.util';

// https://github.com/doublesharp/nodemailer-mock?tab=readme-ov-file#example-using-jest
const { mock } = nodemailer as unknown as NodemailerMock;

describe('POST /api/users/forgot-password', () => {
    describe('Input sanitization (wiring test)', () => {
        describe('Email is not a valid email address', () => {
            test('return status 400 BAD REQUEST and INVALID_EMAIL error message', async () => {
                const res = await request(testKit.server)
                    .post(testKit.endpoints.forgotPassword)
                    .send({ email: 'invalid-email' });
                expect(res.statusCode).toBe(400);
                expect(res.body)
                    .toStrictEqual({ error: usersApiErrors.INVALID_EMAIL })
            });
        });
    });

    describe('Email successfully sent', () => {
        test('email should contain a token generated with the secret: JWT_PASSWORD_RECOVERY_PRIVATE_KEY', async () => {
            // create user            
            const { userEmail } = await createUser(getRandomRole());

            // forgot-password endpoint
            await request(testKit.server)
                .post(testKit.endpoints.forgotPassword)
                .send({ email: userEmail })
                .expect(status2xx);

            // obtain token
            const sentEmails = mock.getSentMail();
            expect(sentEmails.length).toBe(1);                
            const tokenInLink = extractTokenFromResetPasswordLink(sentEmails[0])            

            expect(testKit.passwordRecovJwt.verify(tokenInLink)).not.toBeNull()
        });
    });

    describe('Email provided', () => {
        describe('User email exists', () => {
            test('Send email to the user email', async () => {
                // create user            
                const { userEmail } = await createUser(getRandomRole());

                // forgot-password endpoint
                await request(testKit.server)
                    .post(testKit.endpoints.forgotPassword)
                    .send({ email: userEmail })
                    .expect(status2xx);

                const sentEmails = mock.getSentMail();
                expect(sentEmails.length).toBe(1);
                expect(sentEmails[0].to).toBe(userEmail);
            });
        });

        describe('User email does not exist', () => {
            test('do not send any email', async () => {
                await request(testKit.server)
                    .post(testKit.endpoints.forgotPassword)
                    .send({ email: 'nonexistent@example.com' })
                    .expect(status2xx);

                const sentEmails = mock.getSentMail();
                expect(sentEmails.length).toBe(0);
            });

            test('return status 200 and a generic text message', async () => {
                const res = await request(testKit.server)
                    .post(testKit.endpoints.forgotPassword)
                    .send({ email: 'nonexistent@example.com' })
                    .expect(200);

                expect(res.text)
                    .toEqual('If that account exists, you will receive an email.');
            });
        });
    });

    describe('Username provided', () => {
        describe('Username exists', () => {
            test('Send email to the user email', async () => {
                // create user            
                const { userName, userEmail } = await createUser(getRandomRole());

                // forgot-password endpoint
                await request(testKit.server)
                    .post(testKit.endpoints.forgotPassword)
                    .send({ username: userName })
                    .expect(status2xx);

                const sentEmails = mock.getSentMail();
                expect(sentEmails.length).toBe(1);
                expect(sentEmails[0].to).toBe(userEmail);
            });
        });

        describe('Username does not exist', () => {
            test('do not send any email', async () => {
                await request(testKit.server)
                    .post(testKit.endpoints.forgotPassword)
                    .send({ username: testKit.userDataGenerator.name() })
                    .expect(status2xx);

                const sentEmails = mock.getSentMail();
                expect(sentEmails.length).toBe(0);
            });

            test('return status 200 and a generic text message', async () => {
                const res = await request(testKit.server)
                    .post(testKit.endpoints.forgotPassword)
                    .send({ username: testKit.userDataGenerator.name() })
                    .expect(200);

                expect(res.text)
                    .toEqual('If that account exists, you will receive an email.');
            });
        });
    });
});