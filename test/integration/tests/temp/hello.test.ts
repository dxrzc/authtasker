import request from 'supertest';
import * as nodemailer from "nodemailer";
import { NodemailerMock } from "nodemailer-mock";
import { testKit } from '@integration/utils/testKit';
const { mock } = nodemailer as unknown as NodemailerMock;

describe('Testing something', () => {
    test('Bla bla bla...', async () => {

        const user = testKit.userDataGenerator.fullUser();
        const userEmail = user.email;

        console.log({ userEmail });

        const userCreatedResponse = await request(testKit.server)
            .post(testKit.endpoints.register)
            .send(user)

        const sessionToken = userCreatedResponse.body.token;

        const requestEmailValidationResponse = await request(testKit.server)
            .post(testKit.endpoints.requestEmailValidation)
            .set('Authorization', `Bearer ${sessionToken}`);

        const sentEmails = mock.getSentMail();
        expect(sentEmails.length).toBe(1);

        console.log({ sentEmails });
    });
});