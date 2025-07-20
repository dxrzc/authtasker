import { e2eKit } from '@e2e/utils/e2eKit.util';
import { expectRequestToFail } from '@e2e/utils/expect-request-to-fail.util';

describe('Authentication', () => {
    describe('Logout', () => {
        test.concurrent('refresh token is not longer valid', async () => {
            // register a user
            const createdUserResponse = await e2eKit.client.post(
                e2eKit.endpoints.register,
                e2eKit.userDataGenerator.fullUser()
            );
            const refreshToken = createdUserResponse.data.refreshToken;
            const sessionToken = createdUserResponse.data.sessionToken;
            // logout user
            await e2eKit.client.post(
                e2eKit.endpoints.logout,
                { refreshToken },
                { headers: { Authorization: `Bearer ${sessionToken}` } }
            );
            // try to use the refresh token
            expectRequestToFail({
                expectedStatus: 401,
                request: e2eKit.client.post(
                    e2eKit.endpoints.refreshToken,
                    { refreshToken },
                )
            });
        });

        test.concurrent('session token is not longer valid', async () => {
            // register a user
            const createdUserResponse = await e2eKit.client.post(
                e2eKit.endpoints.register,
                e2eKit.userDataGenerator.fullUser()
            );
            const refreshToken = createdUserResponse.data.refreshToken;
            const sessionToken = createdUserResponse.data.sessionToken;
            // logout user
            await e2eKit.client.post(
                e2eKit.endpoints.logout,
                { refreshToken },
                { headers: { Authorization: `Bearer ${sessionToken}` } }
            );
            // try to use the session token
            expectRequestToFail({
                expectedStatus: 401,
                request: e2eKit.client.get(
                    e2eKit.endpoints.myProfile,
                    { headers: { Authorization: `Bearer ${sessionToken}` } }
                )
            })
        });
    });
});