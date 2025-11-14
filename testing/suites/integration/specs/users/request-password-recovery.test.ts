import { testKit } from '@integration/kit/test.kit';
import { createUser } from '@integration/utils/create-user.util';
import { usersApiErrors } from 'src/messages/users-api.error.messages';
import { NodemailerMock } from 'nodemailer-mock';
import * as nodemailer from 'nodemailer';
import { status2xx } from '@integration/utils/status-2xx.util';
import { authSuccessMessages } from 'src/messages/auth.success.messages';

const { mock } = nodemailer as unknown as NodemailerMock;

describe(`POST ${testKit.urls.forgotPassword}`, () => {
    describe('Successful request ', () => {
        test('email sent to provided email address', async () => {
            const { sessionToken, email } = await createUser();
            await testKit.agent
                .post(testKit.urls.forgotPassword)
                .set('Authorization', `Bearer ${sessionToken}`)
                .send({ email })
                .expect(status2xx);
            const sentEmails = mock.getSentMail();
            expect(sentEmails.length).toBe(1);
            expect(sentEmails[0].to).toBe(email);
        });

        test('return 200 status code and password recovery message', async () => {
            const { sessionToken, email } = await createUser();
            const response = await testKit.agent
                .post(testKit.urls.forgotPassword)
                .set('Authorization', `Bearer ${sessionToken}`)
                .send({ email });
            expect(response.body).toEqual({
                message: authSuccessMessages.PASSWORD_RECOVERY_REQUESTED,
            });
            expect(response.status).toBe(200);
        });
    });

    describe('Invalid email format', () => {
        test('return 400 status code and invalid email format error message', async () => {
            const { sessionToken } = await createUser();
            const response = await testKit.agent
                .post(testKit.urls.forgotPassword)
                .set('Authorization', `Bearer ${sessionToken}`)
                .send({ email: 'invalid-email-format' });
            expect(response.body).toEqual({ error: usersApiErrors.INVALID_EMAIL });
            expect(response.status).toBe(400);
        });
    });

    describe('Email not provided', () => {
        test('return 400 status code and email not provided error message', async () => {
            const { sessionToken } = await createUser();
            const response = await testKit.agent
                .post(testKit.urls.forgotPassword)
                .set('Authorization', `Bearer ${sessionToken}`)
                .send({});
            expect(response.body).toEqual({ error: usersApiErrors.EMAIL_NOT_PROVIDED });
            expect(response.status).toBe(400);
        });
    });

    describe('User in email does not exist', () => {
        test('return 200 status code and password recovery message', async () => {
            const { sessionToken } = await createUser();
            const response = await testKit.agent
                .post(testKit.urls.forgotPassword)
                .set('Authorization', `Bearer ${sessionToken}`)
                .send({ email: testKit.userData.email });
            expect(response.body).toEqual({
                message: authSuccessMessages.PASSWORD_RECOVERY_REQUESTED,
            });
            expect(response.status).toBe(200);
        });

        test('no email is sent', async () => {
            const { sessionToken } = await createUser();
            await testKit.agent
                .post(testKit.urls.forgotPassword)
                .set('Authorization', `Bearer ${sessionToken}`)
                .send({ email: testKit.userData.email })
                .expect(status2xx);
            const sentEmails = mock.getSentMail();
            expect(sentEmails.length).toBe(0);
        });
    });
});
