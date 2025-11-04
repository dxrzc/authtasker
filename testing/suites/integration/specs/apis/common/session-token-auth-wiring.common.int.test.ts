import request from 'supertest';
import { testKit } from '@integration/utils/testKit.util';
import { status2xx } from '@integration/utils/status2xx.util';
import { createUser } from '@integration/utils/createUser.util';
import { authErrors } from 'src/common/errors/messages/auth.error.messages';
import { protectedRoutes } from '@integration/fixtures/protected-routes.fixture';
import { getRandomRole } from '@test/tools/utilities/get-random-role.util';

describe('Session Token Auth Wiring', () => {
    test.each(protectedRoutes)(
        'return 401 UNAUTHORIZED when token is not provided in $method $url',
        async ({ method, url }) => {
            const expectedStatus = 401;
            const expectedErrorMssg = authErrors.INVALID_TOKEN;
            const response = await request(testKit.server)[method](url);
            expect(response.statusCode).toBe(expectedStatus);
            expect(response.body).toStrictEqual({ error: expectedErrorMssg });
        },
    );

    test.each(protectedRoutes)(
        'return 401 UNAUTHORIZED when token belongs to a closed session in $method $url',
        async ({ method, url }) => {
            const expectedStatus = 401;
            const expectedErrorMssg = authErrors.INVALID_TOKEN;
            // register
            const { sessionToken, refreshToken } = await createUser(getRandomRole());
            // logout
            await request(testKit.server)
                .post(testKit.endpoints.logout)
                .set('Authorization', `Bearer ${sessionToken}`)
                .send({ refreshToken })
                .expect(status2xx);
            // access endpoint with the token
            const response = await request(testKit.server)
                [method](url)
                .set('Authorization', `Bearer ${sessionToken}`);
            expect(response.statusCode).toBe(expectedStatus);
            expect(response.body).toStrictEqual({ error: expectedErrorMssg });
        },
    );
});
