import { e2eKit } from '@e2e/utils/e2eKit.util';
import { expectRequestToFail } from '@e2e/utils/expect-request-to-fail.util';

describe('Authorization', () => {
    describe('Login', () => {
        test.concurrent(
            'returned refresh token can be used to refresh the session token',
            async () => {
                // create user
                const { email, password, name } = e2eKit.userDataGenerator.fullUser();
                await e2eKit.client.post(e2eKit.endpoints.register, { email, password, name });
                // login user
                const loginResponse = await e2eKit.client.post(e2eKit.endpoints.login, {
                    email,
                    password,
                });
                const refreshToken = loginResponse.data.refreshToken;
                // refresh session
                await e2eKit.client.post(e2eKit.endpoints.refreshToken, { refreshToken });
            },
        );

        test.concurrent(
            'returned session token can be used to access protected resources',
            async () => {
                const { email, password, name } = e2eKit.userDataGenerator.fullUser();
                await e2eKit.client.post(e2eKit.endpoints.register, { email, password, name });
                // login user
                const loginResponse = await e2eKit.client.post(e2eKit.endpoints.login, {
                    email,
                    password,
                });
                const sessionToken = loginResponse.data.sessionToken;
                const userID = loginResponse.data.user.id;
                // accessing a protected resource
                await e2eKit.client.delete(`${e2eKit.endpoints.usersAPI}/${userID}`, {
                    headers: { Authorization: `Bearer ${sessionToken}` },
                });
            },
        );

        describe('User reaches the max active refresh tokens per user', () => {
            test.concurrent('return 403 FORBIDDEN', async () => {
                const maxActiveSessions = e2eKit.configService.MAX_REFRESH_TOKENS_PER_USER;
                // create user (one refresh token obtained)
                const { email, password, name } = e2eKit.userDataGenerator.fullUser();
                await e2eKit.client.post(e2eKit.endpoints.register, { email, password, name });
                // login n-1 times since we get a refresh when creating our user
                for (let i = 0; i < maxActiveSessions - 1; i++) {
                    await e2eKit.client.post(e2eKit.endpoints.login, { email, password });
                }
                // last and bad login
                await expectRequestToFail({
                    expectedStatus: 403,
                    request: e2eKit.client.post(e2eKit.endpoints.login, { email, password }),
                });
            });
        });
    });
});
