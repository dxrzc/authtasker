import request from 'supertest'
// https://github.com/doublesharp/nodemailer-mock?tab=readme-ov-file#example-using-jest
import * as nodemailer from "nodemailer";
import { NodemailerMock } from "nodemailer-mock";
const { mock } = nodemailer as unknown as NodemailerMock;
import { createUser, getTokenFromMail, status2xx, testKit } from "@integration/utils";

describe('POST /api/users/confirmEmailValidation', () => {
    test('upgrade user to editor and change emailValidated property to true', async () => {
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

    describe('Response - Success', () => {
        test('return status 200 OK', async () => {
            const expectedStatus = 200;

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
                .expect(expectedStatus);
        });
    });
});