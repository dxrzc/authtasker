import { testKit } from '@integration/kit/test.kit';
import { createUser } from '@integration/utils/create-user.util';
import { status2xx } from '@integration/utils/status-2xx.util';
import * as nodemailer from 'nodemailer';
import { NodemailerMock } from 'nodemailer-mock';
import { UserRole } from 'src/enums/user-role.enum';
import { usersApiErrors } from 'src/messages/users-api.error.messages';

const { mock } = nodemailer as unknown as NodemailerMock;

describe(`POST ${testKit.urls.requestEmailValidation}`, () => {
    describe('User email is already verified', () => {
        test(`should return BAD REQUEST status code and ${usersApiErrors.EMAIL_ALREADY_VERIFIED} message`, async () => {
            const { id, sessionToken } = await createUser(UserRole.READONLY);
            await testKit.models.user.findByIdAndUpdate(id, { emailValidated: true });
            const response = await testKit.agent
                .post(testKit.urls.requestEmailValidation)
                .set('Authorization', `Bearer ${sessionToken}`);
            expect(response.body).toStrictEqual({ error: usersApiErrors.EMAIL_ALREADY_VERIFIED });
            expect(response.statusCode).toBe(400);
        });
    });

    describe('Successful request', () => {
        test('email should be sent to the user email address', async () => {
            const { sessionToken, email } = await createUser(UserRole.READONLY);
            await testKit.agent
                .post(testKit.urls.requestEmailValidation)
                .set('Authorization', `Bearer ${sessionToken}`)
                .expect(status2xx);
            const sentEmails = mock.getSentMail();
            expect(sentEmails.length).toBe(1);
            expect(sentEmails[0].to).toBe(email);
        });
    });

    describe('Successful request', () => {
        test('return 204 status code', async () => {
            const { sessionToken } = await createUser(UserRole.READONLY);
            await testKit.agent
                .post(testKit.urls.requestEmailValidation)
                .set('Authorization', `Bearer ${sessionToken}`)
                .expect(204);
        });
    });
});
