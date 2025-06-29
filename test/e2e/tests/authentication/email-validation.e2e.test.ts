import { ImapFlow } from "imapflow";
import { e2eKit } from '@e2e/utils/e2eKit.util';
import { getEmailConfirmationFromLink } from '@e2e/utils/get-email-confirmation-link.util';

describe('Authentication', () => {
    describe('Email validation', () => {
        let client: ImapFlow;

        beforeAll(async () => {
            client = new ImapFlow({
                logger: false,
                connectionTimeout: 10000,
                host: 'imap.ethereal.email',
                port: 993,
                secure: true,
                auth: {
                    user: e2eKit.configService.MAIL_SERVICE_USER,
                    pass: e2eKit.configService.MAIL_SERVICE_PASS,
                }
            });
            await client.connect();
        });

        afterAll(async () => {
            await client.logout();
        });

        // close the inbox in order to refresh it the next time is opened
        afterEach(async () => {
            await client.mailboxClose();
        });

        describe('Email is successfully validated', () => {
            test('User can create tasks', async () => {
                // create user
                const createdUserResponse = await e2eKit.client.post(
                    e2eKit.endpoints.register,
                    e2eKit.userDataGenerator.fullUser()
                );
                const sessionToken = createdUserResponse.data.sessionToken;
                const userEmail = createdUserResponse.data.user.email;

                // request email validation
                await e2eKit.client.post(e2eKit.endpoints.requestEmailValidation, null, {
                    headers: {
                        Authorization: `Bearer ${sessionToken}`
                    }
                });
                
                // confirm email validation                
                await e2eKit.client.get(await getEmailConfirmationFromLink(client, userEmail));

                // create task
                await e2eKit.client.post(
                    e2eKit.endpoints.createTask,
                    e2eKit.tasksDataGenerator.fullTask(),
                    { headers: { Authorization: `Bearer ${sessionToken}` } }
                );
            });
        });
    });
});