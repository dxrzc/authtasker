import request from 'supertest'
// https://github.com/doublesharp/nodemailer-mock?tab=readme-ov-file#example-using-jest
import * as nodemailer from "nodemailer";
import { NodemailerMock } from "nodemailer-mock";
const { mock } = nodemailer as unknown as NodemailerMock;
import { createUser, getTokenFromMail, status2xx, testKit } from "@integration/utils";
import { makeSessionTokenBlacklistKey } from '@logic/token';

describe('POST /api/users/confirmEmailValidation/:token', () => {
    describe('Database Operations', () => {
        test('update user role and emailValidated', async () => {
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
                .post(`${testKit.endpoints.confirmEmailValidation}/${tokenInEmail}`)
                .expect(status2xx);

            const userInDb = await testKit.userModel.findById(userId);
            expect(userInDb!.role).toBe('editor');
            expect(userInDb!.emailValidated).toBeTruthy();
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

            // Confirm email validation
            await request(testKit.server)
                .post(`${testKit.endpoints.confirmEmailValidation}/${tokenInEmail}`)
                .expect(status2xx);

            // expect token in blacklist
            const blacklistedToken = testKit.redisService.get(makeSessionTokenBlacklistKey(tokenInEmail));
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
                .post(`${testKit.endpoints.confirmEmailValidation}/${tokenInEmail}`)

            expect(response.body).toStrictEqual({ message: expect.any(String) });
            expect(response.statusCode).toBe(expectedStatus);
        });
    });
});