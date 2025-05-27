import { createUser, status2xx, testKit } from '@integration/utils';
import request from 'supertest';

// These tests don't intend to test the roles middleware but rather 
// make sure the middleware is wired to the following routes.

const protectedRoutes = [
    { method: 'post', url: testKit.endpoints.requestEmailValidation }, // requestEmailValidation
    { method: 'post', url: testKit.endpoints.logout }, // logout
    { method: 'delete', url: `${testKit.endpoints.usersAPI}/123` }, // delete    
    { method: 'patch', url: `${testKit.endpoints.usersAPI}/123` }, // update
    { method: 'get', url: `${testKit.endpoints.usersAPI}/123` }, // find by id
    { method: 'get', url: testKit.endpoints.usersAPI }, // findAll
] as const;

describe('Auth Middleware Wiring', () => {
    test.concurrent.each(
        protectedRoutes
    )('return 401 UNAUTHORIZED when token is not provided in $method $url', async ({ method, url }) => {
        const expectedStatus = 401;
        const expectedErrorMssg = 'No token provided';

        // Endpoint
        const response = await request(testKit.server)[method](url);

        expect(response.statusCode).toBe(expectedStatus);
        expect(response.body).toStrictEqual({ error: expectedErrorMssg });
    });

    test.concurrent.each(
        protectedRoutes
    )('return 401 UNAUTHORIZED when token blacklisted $method $url', async ({ method, url }) => {
        const expectedStatus = 401;
        const expectedErrorMssg = 'Invalid bearer token';
        const { sessionToken } = await createUser('admin');

        // Logout 
        await request(testKit.server)
            .post(testKit.endpoints.logout)
            .set('Authorization', `Bearer ${sessionToken}`)
            .expect(status2xx);

        // Endpoint
        const response = await request(testKit.server)[method](url)
            .set('Authorization', `Bearer ${sessionToken}`);

        expect(response.statusCode).toBe(expectedStatus);
        expect(response.body).toStrictEqual({ error: expectedErrorMssg });
    });
});