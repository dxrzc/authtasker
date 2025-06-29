import { e2eKit } from '@e2e/utils/e2eKit.util';
import { expectRequestToFail } from '@e2e/utils/expect-request-to-fail.util';

describe('Authentication', () => {
    describe('Refresh', () => {
        test('old refresh token is not longer valid', async () => {
            const expectedStatus = 401;

            const createdUserResponse = await e2eKit.client.post(
                e2eKit.endpoints.register,
                e2eKit.userDataGenerator.fullUser()
            );
            const refreshToken = createdUserResponse.data.refreshToken;
            const sessionToken = createdUserResponse.data.sessionToken;

            // get a new refresh token
            await e2eKit.client.post(
                e2eKit.endpoints.refreshToken,
                { refreshToken },
            );

            // refreshing fails when a disabled refresh token is sent
            await expectRequestToFail({
                expectedStatus,
                request: e2eKit.client.post(
                    e2eKit.endpoints.refreshToken,
                    { refreshToken },
                )
            });
        });

        test('returned session token can be used to access other protected resources', async () => {
            const createdUserResponse = await e2eKit.client.post(
                e2eKit.endpoints.register,
                e2eKit.userDataGenerator.fullUser()
            );
            const refreshToken = createdUserResponse.data.refreshToken;
            const sessionToken = createdUserResponse.data.sessionToken;

            // refresh
            const refreshResponse = await e2eKit.client.post(
                e2eKit.endpoints.refreshToken,
                { refreshToken },
            );

            const newSessionToken = refreshResponse.data.sessionToken;

            // accessing a protected route /api/users/get/my
            await e2eKit.client.get(
                e2eKit.endpoints.myProfile,
                { headers: { Authorization: `Bearer ${newSessionToken}` } }
            );
        });
    });
});