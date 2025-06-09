import { createUser, getTokenFromMail, status2xx, testKit } from '@integration/utils';
import request from 'supertest';
// https://github.com/doublesharp/nodemailer-mock?tab=readme-ov-file#example-using-jest
import * as nodemailer from "nodemailer";
import { NodemailerMock } from "nodemailer-mock";
import { usersApiErrors } from '@root/common/errors/messages';
const { mock } = nodemailer as unknown as NodemailerMock;

describe('POST /api/users/requestEmailValidation', () => {
    describe('Email service operations', () => {
        test('nodemailer send the email to the user email', async () => {
            // Create user
            const { sessionToken, userEmail } = await createUser('readonly');

            // Request email validation
            await request(testKit.server)
                .post(testKit.endpoints.requestEmailValidation)
                .set('Authorization', `Bearer ${sessionToken}`)
                .expect(status2xx);

            const sentEmails = mock.getSentMail();
            expect(sentEmails.length).toBe(1);
            expect(sentEmails[0].to).toBe(userEmail);
        });
    });

    describe('Database Operations', () => {
        test('return 400 BAD REQUEST when user email is already validated', async () => {
            const expectedStatus = 400;
            const expectedErrorMssg = usersApiErrors.USER_EMAIL_ALREADY_VALIDATED;

            // Create editor
            const { sessionToken } = await createUser('editor');

            // Request email validation
            const response = await request(testKit.server)
                .post(testKit.endpoints.requestEmailValidation)
                .set('Authorization', `Bearer ${sessionToken}`);

            expect(response.body).toStrictEqual({ error: expectedErrorMssg });
            expect(response.statusCode).toBe(expectedStatus);
        });
    });

    describe('Response', () => {
        test('return 204 NO CONTENT', async () => {
            const expectedStatus = 204;

            // Create editor
            const { sessionToken } = await createUser('readonly');

            // Request email validation
            const response = await request(testKit.server)
                .post(testKit.endpoints.requestEmailValidation)
                .set('Authorization', `Bearer ${sessionToken}`);

            expect(response.body).toStrictEqual({});
            expect(response.statusCode).toBe(expectedStatus);
        });
    });
});