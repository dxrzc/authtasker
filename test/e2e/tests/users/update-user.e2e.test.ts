import { e2eKit } from '@e2e/utils/e2eKit.util';
import { expectRequestToFail } from '@e2e/utils/expect-request-to-fail.util';
import { getEmailConfirmationFromLink } from '@e2e/utils/get-email-confirmation-link.util';

describe('Users API', () => {
    describe('Update user', () => {
        test.concurrent('user can login with new updated data', async () => {
            const createdUserResponse = await e2eKit.client.post(
                e2eKit.endpoints.register,
                e2eKit.userDataGenerator.fullUser(),
            );
            // update
            const newPassword = e2eKit.userDataGenerator.password();
            const newEmail = e2eKit.userDataGenerator.email();
            await e2eKit.client.patch(
                `${e2eKit.endpoints.usersAPI}/${createdUserResponse.data.user.id}`,
                { password: newPassword, email: newEmail },
                { headers: { Authorization: `Bearer ${createdUserResponse.data.sessionToken}` } },
            );
            // login with new password and email
            await e2eKit.client.post(e2eKit.endpoints.login, {
                password: newPassword,
                email: newEmail,
            });
        });

        describe('Password is updated', () => {
            test.concurrent('all user refresh tokens remain invalidated', async () => {
                const { name, email, password } = e2eKit.userDataGenerator.fullUser();
                // create user provides a refresh token
                const createdUserResponse = await e2eKit.client.post(e2eKit.endpoints.register, {
                    name,
                    email,
                    password,
                });
                const sessionToken = createdUserResponse.data.sessionToken;
                const userID = createdUserResponse.data.user.id;
                const refreshTokenFromRegistration = createdUserResponse.data.refreshToken;
                // login provides a new refresh token
                const loginResponse = await e2eKit.client.post(e2eKit.endpoints.login, {
                    password,
                    email,
                });
                const refreshTokenFromLogin = loginResponse.data.refreshToken;
                // update user password trigger old refresh tokens invalidation
                await e2eKit.client.patch(
                    `${e2eKit.endpoints.usersAPI}/${userID}`,
                    { password: e2eKit.userDataGenerator.password() },
                    { headers: { Authorization: `Bearer ${sessionToken}` } },
                );
                // try to use the old refresh tokens to get a new session token
                expectRequestToFail({
                    expectedStatus: 401,
                    request: e2eKit.client.post(e2eKit.endpoints.refreshToken, {
                        refreshToken: refreshTokenFromRegistration,
                    }),
                });
                expectRequestToFail({
                    expectedStatus: 401,
                    request: e2eKit.client.post(e2eKit.endpoints.refreshToken, {
                        refreshToken: refreshTokenFromLogin,
                    }),
                });
            });

            test.concurrent('provided session token remains invalid', async () => {
                const { name, email, password } = e2eKit.userDataGenerator.fullUser();
                // create user provides a refresh token
                const createdUserResponse = await e2eKit.client.post(e2eKit.endpoints.register, {
                    name,
                    email,
                    password,
                });
                const sessionToken = createdUserResponse.data.sessionToken;
                const userID = createdUserResponse.data.user.id;
                // update user password trigger old session token invalidation
                await e2eKit.client.patch(
                    `${e2eKit.endpoints.usersAPI}/${userID}`,
                    { password: e2eKit.userDataGenerator.password() },
                    { headers: { Authorization: `Bearer ${sessionToken}` } },
                );
                // try to use the old session token to access a protected endpoint
                expectRequestToFail({
                    expectedStatus: 401,
                    request: e2eKit.client.get(`${e2eKit.endpoints.usersAPI}/${userID}`, {
                        headers: { Authorization: `Bearer ${sessionToken}` },
                    }),
                });
            });
        });

        describe('User with role "editor" changes their email', () => {
            test.concurrent('user can not create tasks anymore', async () => {
                // create user
                const user = e2eKit.userDataGenerator.fullUser();
                const createdUserResponse = await e2eKit.client.post(
                    e2eKit.endpoints.register,
                    user,
                );
                const userID = createdUserResponse.data.user.id;
                const sessionToken = createdUserResponse.data.sessionToken;
                const userEmail = createdUserResponse.data.user.email;

                // validate email
                await e2eKit.client.post(
                    e2eKit.endpoints.requestEmailValidation,
                    {},
                    { headers: { Authorization: `Bearer ${sessionToken}` } },
                );
                await e2eKit.client.get(
                    await getEmailConfirmationFromLink(e2eKit.emailClient, userEmail),
                );

                // change email
                const newEmail = e2eKit.userDataGenerator.email();
                await e2eKit.client.patch(
                    `${e2eKit.endpoints.usersAPI}/${userID}`,
                    { email: newEmail },
                    { headers: { Authorization: `Bearer ${sessionToken}` } },
                );

                // login to get a new session token
                const loginResponse = await e2eKit.client.post(e2eKit.endpoints.login, {
                    email: newEmail,
                    password: user.password,
                });
                const newSessionToken = loginResponse.data.sessionToken;

                // try to crete a task
                expectRequestToFail({
                    expectedStatus: 403,
                    request: e2eKit.client.post(
                        e2eKit.endpoints.createTask,
                        e2eKit.tasksDataGenerator.fullTask(),
                        { headers: { Authorization: `Bearer ${newSessionToken}` } },
                    ),
                });
            });
        });
    });
});
