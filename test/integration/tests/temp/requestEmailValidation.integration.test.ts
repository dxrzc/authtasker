import { createUser, getTokenFromMail, status2xx, testKit } from '@integration/utils';
import request from 'supertest';
// https://github.com/doublesharp/nodemailer-mock?tab=readme-ov-file#example-using-jest
import * as nodemailer from "nodemailer";
import { NodemailerMock } from "nodemailer-mock";
const { mock } = nodemailer as unknown as NodemailerMock;

describe('POST /api/users/requestEmailValidation', () => {
    describe('Token in the sent url', () => {
        test.concurrent('return status 401 UNAUTHORIZED if token is used for other purposes', async () => {
            const expectedStatus = 401;
            const expectedErrorMssg = 'Invalid bearer token';

            // Create user
            const { sessionToken, userId } = await createUser('readonly');

            // Request email validation
            await request(testKit.server)
                .post(testKit.endpoints.requestEmailValidation)
                .set('Authorization', `Bearer ${sessionToken}`)
                .expect(status2xx);

            const tokenInEmail = getTokenFromMail(mock.getSentMail().at(0)?.html as string);

            // Use it as a session token
            const response = await request(testKit.server)
                .delete(`${testKit.endpoints.usersAPI}/${userId}`)
                .set('Authorization', `Bearer ${tokenInEmail}`);

            expect(response.body).toEqual({ error: expectedErrorMssg });
            expect(response.statusCode).toBe(expectedStatus);
        });
    });

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

    describe('Response - Success', () => {
        test.concurrent('return 204 NO CONTENT', async () => {
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

    describe('Response - Failure', () => {
        test.concurrent('return 400 BAD REQUEST when email is already validated', async () => {
            const expectedStatus = 400;
            const expectedErrorMssg = 'User email is already validated';

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
});