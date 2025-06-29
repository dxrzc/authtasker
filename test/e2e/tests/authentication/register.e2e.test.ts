import { e2eKit } from '@e2e/utils/e2eKit.util';

describe('Authentication', () => {
    describe('Register', () => {
        test.concurrent('returned session token can be used to access protected resources', async () => {
            // register a user
            const createdUserResponse = await e2eKit.client.post(
                e2eKit.endpoints.register,
                e2eKit.userDataGenerator.fullUser()
            );
            const sessionToken = createdUserResponse.data.sessionToken;
            const userID = createdUserResponse.data.user.id;
            // accessing a protected resource (patch) using the session token
            await e2eKit.client.patch(
                `${e2eKit.endpoints.usersAPI}/${userID}`,
                { name: e2eKit.userDataGenerator.name() },
                { headers: { Authorization: `Bearer ${sessionToken}` } }
            );
        });

        test.concurrent('returned refresh token can be used to refresh the session token', async () => {
            // register a user
            const createdUserResponse = await e2eKit.client.post(
                e2eKit.endpoints.register,
                e2eKit.userDataGenerator.fullUser()
            );
            const refreshToken = createdUserResponse.data.refreshToken;
            // refresh token endpoint
            await e2eKit.client.post(
                e2eKit.endpoints.refreshToken,
                { refreshToken }
            );
        });

        test.concurrent('user can be found using id after register', async () => {
            // register user
            const createdUserResponse = await e2eKit.client.post(
                e2eKit.endpoints.register,
                e2eKit.userDataGenerator.fullUser()
            );
            const userID = createdUserResponse.data.user.id;
            // find user
            await e2eKit.client.get(
                `${e2eKit.endpoints.usersAPI}/${userID}`,
                { headers: { Authorization: `Bearer ${e2eKit.adminSessionToken}` } }
            );
        });
    });
});