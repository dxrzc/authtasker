import { ImapFlow } from 'imapflow';
import { e2eKit } from '@e2e/utils/e2eKit.util';
import { getEmailConfirmationFromLink } from '@e2e/utils/get-email-confirmation-link.util';
import { expectRequestToFail } from '@e2e/utils/expect-request-to-fail.util';

describe('Users API', () => {
    describe('Delete user', () => {
        describe('User is upgraded to editor', () => {
            describe('User create some tasks', () => {
                describe('User is deleted', () => {
                    test('all user tasks are deleted as well', async () => {
                        // create user
                        const createdUserResponse = await e2eKit.client.post(
                            e2eKit.endpoints.register,
                            e2eKit.userDataGenerator.fullUser()
                        );
                        const sessionToken = createdUserResponse.data.sessionToken;
                        const userId = createdUserResponse.data.user.id;
                        const userEmail = createdUserResponse.data.user.email;

                        // email-validation                    
                        await e2eKit.client.post(
                            e2eKit.endpoints.requestEmailValidation,
                            null,
                            { headers: { Authorization: `Bearer ${sessionToken}` } }
                        );
                        await e2eKit.client.get(await getEmailConfirmationFromLink(e2eKit.emailClient, userEmail));
                        
                        // task 1
                        const createdTask1Res = await e2eKit.client.post(
                            e2eKit.endpoints.createTask,
                            e2eKit.tasksDataGenerator.fullTask(),
                            { headers: { Authorization: `Bearer ${sessionToken}` } }
                        );
                        const task1Id = createdTask1Res.data.id;
                        expect(task1Id).toBeDefined();

                        // task 2
                        const createdTask2Res = await e2eKit.client.post(
                            e2eKit.endpoints.createTask,
                            e2eKit.tasksDataGenerator.fullTask(),
                            { headers: { Authorization: `Bearer ${sessionToken}` } }
                        );
                        const task2Id = createdTask2Res.data.id;
                        expect(task2Id).toBeDefined();

                        // delete user
                        await e2eKit.client.delete(
                            `${e2eKit.endpoints.usersAPI}/${userId}`,
                            { headers: { Authorization: `Bearer ${e2eKit.adminSessionToken}` } }
                        );

                        // tasks are not found
                        expectRequestToFail({
                            expectedStatus: 404,
                            request: e2eKit.client.get(
                                `${e2eKit.endpoints.tasksAPI}/${task1Id}`,
                                { headers: { Authorization: `Bearer ${e2eKit.adminSessionToken}` } }
                            )
                        });
                        expectRequestToFail({
                            expectedStatus: 404,
                            request: e2eKit.client.get(
                                `${e2eKit.endpoints.tasksAPI}/${task2Id}`,
                                { headers: { Authorization: `Bearer ${e2eKit.adminSessionToken}` } }
                            )
                        });
                    });
                });
            });
        });
    });
});