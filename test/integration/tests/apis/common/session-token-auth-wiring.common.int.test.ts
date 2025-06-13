import request from 'supertest';
import { testKit } from '@integration/utils/testKit.util';
import { status2xx } from '@integration/utils/status2xx.util';
import { protectedRoutes } from '@integration/fixtures/protected-routes.fixture';
import { authErrors } from '@root/common/errors/messages/auth.error.messages';

describe('Session Token Auth Wiring', () => {
    test.concurrent.each(protectedRoutes)('return 401 UNAUTHORIZED when token is not provided in $method $url', async ({ method, url }) => {
        const expectedStatus = 401;
        const expectedErrorMssg = authErrors.INVALID_TOKEN;
        const response = await request(testKit.server)[method](url);
        expect(response.statusCode).toBe(expectedStatus);
        expect(response.body).toStrictEqual({ error: expectedErrorMssg });
    });

    test.concurrent.each(protectedRoutes)('return 401 UNAUTHORIZED when token belongs to a closed session in $method $url', async ({ method, url }) => {
        const expectedStatus = 401;
        const expectedErrorMssg = authErrors.INVALID_TOKEN;

        // register
        const registerResponse = await request(testKit.server)
            .post(testKit.endpoints.register)
            .send(testKit.userDataGenerator.fullUser())
            .expect(status2xx);
        const sessionToken = registerResponse.body.token;

        // logout
        await request(testKit.server)
            .post(testKit.endpoints.logout)
            .set('Authorization', `Bearer ${sessionToken}`)
            .expect(status2xx);

        // access endpoint with the token
        const response = await request(testKit.server)[method](url)
            .set('Authorization', `Bearer ${sessionToken}`);
        expect(response.statusCode).toBe(expectedStatus);
        expect(response.body).toStrictEqual({ error: expectedErrorMssg });
    });
});