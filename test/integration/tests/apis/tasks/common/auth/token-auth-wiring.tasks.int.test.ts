import request from 'supertest';
import { createUser, status2xx, testKit } from '@integration/utils';
import { tasksApiProtectedRoutes } from './fixtures';

// Ensure the logic in charge of the token authentication is integrated 
// with the tasks API endpoints.

describe('Tasks API - Token Authentication - Wiring', () => {
    test.concurrent.each(
        tasksApiProtectedRoutes
    )('return 401 UNAUTHORIZED when token is not provided in $method $url', async ({ method, url }) => {
        const expectedStatus = 401;
        const expectedErrorMssg = 'No token provided';

        // Endpoint
        const response = await request(testKit.server)[method](url);

        expect(response.statusCode).toBe(expectedStatus);
        expect(response.body).toStrictEqual({ error: expectedErrorMssg });
    });

    test.concurrent.each(
        tasksApiProtectedRoutes
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