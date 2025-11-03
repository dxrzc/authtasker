import { e2eKit } from '@e2e/utils/e2eKit.util';
import { expectRequestToFail } from '@e2e/utils/expect-request-to-fail.util';

describe('Authentication', () => {
    describe('Refresh', () => {
        test.concurrent('old refresh token is not longer valid', async () => {
            const expectedStatus = 401;
            // create user
            const createdUserResponse = await e2eKit.client.post(
                e2eKit.endpoints.register,
                e2eKit.userDataGenerator.fullUser(),
            );
            const refreshToken = createdUserResponse.data.refreshToken;
            // get a new refresh token
            await e2eKit.client.post(e2eKit.endpoints.refreshToken, { refreshToken });
            // refreshing fails when a disabled refresh token is sent
            await expectRequestToFail({
                expectedStatus,
                request: e2eKit.client.post(e2eKit.endpoints.refreshToken, { refreshToken }),
            });
        });

        test.concurrent(
            'returned session token can be used to access other protected resources',
            async () => {
                // create user
                const createdUserResponse = await e2eKit.client.post(
                    e2eKit.endpoints.register,
                    e2eKit.userDataGenerator.fullUser(),
                );
                const refreshToken = createdUserResponse.data.refreshToken;
                // refresh
                const refreshResponse = await e2eKit.client.post(e2eKit.endpoints.refreshToken, {
                    refreshToken,
                });
                const newSessionToken = refreshResponse.data.sessionToken;
                // accessing a protected route /api/users/get/my
                await e2eKit.client.get(e2eKit.endpoints.myProfile, {
                    headers: { Authorization: `Bearer ${newSessionToken}` },
                });
            },
        );

        describe('Session token is sent instead of a refresh token', () => {
            test.concurrent('return 401 UNAUTHORIZED', async () => {
                // create user
                const createdUserResponse = await e2eKit.client.post(
                    e2eKit.endpoints.register,
                    e2eKit.userDataGenerator.fullUser(),
                );
                const sessionToken = createdUserResponse.data.sessionToken;
                expectRequestToFail({
                    expectedStatus: 401,
                    request: e2eKit.client.post(e2eKit.endpoints.refreshToken, {
                        refreshToken: sessionToken,
                    }),
                });
            });
        });
    });
});
