import { e2eKit } from '@e2e/utils/e2eKit.util';
import { getEmailConfirmationFromLink } from '@e2e/utils/get-email-confirmation-link.util';

describe('Authentication', () => {
    describe('Email validation', () => {
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
                await e2eKit.client.get(await getEmailConfirmationFromLink(e2eKit.emailClient, userEmail));

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