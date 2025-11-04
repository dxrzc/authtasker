import request from 'supertest';
import { testKit } from '@integration/utils/testKit.util';
import { status2xx } from '@integration/utils/status2xx.util';
import { createUser } from '@integration/utils/createUser.util';
import { getRandomRole } from '@test/tools/utilities/get-random-role.util';
import { authErrors } from 'src/common/errors/messages/auth.error.messages';

describe('POST /api/users/refresh-token', () => {
    describe('Refresh token is not provided in body', () => {
        test('return status 400 BAD REQUEST and the configured message', async () => {
            const expectedStatus = 400;
            const response = await request(testKit.server).post(testKit.endpoints.refreshToken);
            expect(response.body).toStrictEqual({
                error: authErrors.REFRESH_TOKEN_NOT_PROVIDED_IN_BODY,
            });
            expect(response.statusCode).toBe(expectedStatus);
        });
    });

    test('return a valid session token', async () => {
        const { refreshToken } = await createUser(getRandomRole());
        const response = await request(testKit.server)
            .post(testKit.endpoints.refreshToken)
            .send({ refreshToken })
            .expect(status2xx);
        const sessionToken = response.body.sessionToken;
        expect(testKit.sessionJwt.verify(sessionToken)).not.toBeNull();
    });

    test('return a valid new refresh token', async () => {
        const { refreshToken } = await createUser(getRandomRole());
        const response = await request(testKit.server)
            .post(testKit.endpoints.refreshToken)
            .send({ refreshToken })
            .expect(status2xx);
        const newRefreshToken = response.body.refreshToken;
        expect(testKit.refreshJwt.verify(newRefreshToken)).not.toBeNull();
    });

    test('new refresh token is different from the sent one but conserve the expiration date', async () => {
        const { refreshToken } = await createUser(getRandomRole());
        const response = await request(testKit.server)
            .post(testKit.endpoints.refreshToken)
            .send({ refreshToken })
            .expect(status2xx);
        // tokens are different
        const newRefreshToken = response.body.refreshToken;
        expect(newRefreshToken).not.toBe(refreshToken);
        // same exp date
        const prevRefreshTokenExpDateUnix = testKit.refreshJwt.verify(refreshToken)?.exp!;
        const newRefreshTokenExpDateUnix = testKit.refreshJwt.verify(newRefreshToken)?.exp!;
        expect(
            Math.abs(newRefreshTokenExpDateUnix - prevRefreshTokenExpDateUnix),
        ).toBeLessThanOrEqual(1);
    });

    describe('Response', () => {
        test('return status 200 and new refresh and session token in body', async () => {
            const expectedStatus = 200;
            const { refreshToken } = await createUser(getRandomRole());
            const response = await request(testKit.server)
                .post(testKit.endpoints.refreshToken)
                .send({ refreshToken })
                .expect(expectedStatus);
            expect(response.body.sessionToken).toBeDefined();
            expect(response.body.refreshToken).toBeDefined();
        });
    });
});
