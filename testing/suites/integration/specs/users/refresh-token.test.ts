import { testKit } from '@integration/kit/test.kit';
import { createUser } from '@integration/utils/create-user.util';
import { status2xx } from '@integration/utils/status-2xx.util';
import { getRandomRole } from '@test/tools/utilities/get-random-role.util';
import { authErrors } from 'src/messages/auth.error.messages';

describe(`POST ${testKit.urls.refreshToken}`, () => {
    describe('Refresh token is not provided in body', () => {
        test(`return status 400 BAD REQUEST ${authErrors.REFRESH_TOKEN_NOT_PROVIDED_IN_BODY} message`, async () => {
            const expectedStatus = 400;
            const { statusCode, body } = await testKit.agent.post(testKit.urls.refreshToken);
            expect(body).toStrictEqual({ error: authErrors.REFRESH_TOKEN_NOT_PROVIDED_IN_BODY });
            expect(statusCode).toBe(expectedStatus);
        });
    });

    describe('Token successfully refreshed', () => {
        test('return a valid session token', async () => {
            const { refreshToken } = await createUser(getRandomRole());
            const { body } = await testKit.agent
                .post(testKit.urls.refreshToken)
                .send({ refreshToken })
                .expect(status2xx);
            const sessionToken = body.sessionToken;
            expect(testKit.sessionJwt.verify(sessionToken)).not.toBeNull();
        });

        test('return a valid new refresh token', async () => {
            const { refreshToken } = await createUser(getRandomRole());
            const { body } = await testKit.agent
                .post(testKit.urls.refreshToken)
                .send({ refreshToken })
                .expect(status2xx);
            const newRefreshToken = body.refreshToken;
            expect(testKit.refreshJwt.verify(newRefreshToken)).not.toBeNull();
        });

        test('new refresh token is different from the sent one but conserves the expiration date', async () => {
            const { refreshToken } = await createUser(getRandomRole());
            const { body } = await testKit.agent
                .post(testKit.urls.refreshToken)
                .send({ refreshToken })
                .expect(status2xx);
            // tokens should be different
            const newRefreshToken = body.refreshToken;
            expect(newRefreshToken).not.toBe(refreshToken);
            // same exp date
            const prevTokenExp = testKit.refreshJwt.verify(refreshToken)!.exp!;
            const newTokenExp = testKit.refreshJwt.verify(newRefreshToken)!.exp!;
            expect(Math.abs(newTokenExp - prevTokenExp)).toBeLessThanOrEqual(1);
        });

        test('return status 200 and new refresh and session tokens in body', async () => {
            const { refreshToken } = await createUser(getRandomRole());
            const { body } = await testKit.agent
                .post(testKit.urls.refreshToken)
                .send({ refreshToken })
                .expect(200);
            expect(body.sessionToken).toBeDefined();
            expect(body.refreshToken).toBeDefined();
        });
    });
});
