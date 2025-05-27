import { createUser, status2xx, testKit } from '@integration/utils';
import { JwtService } from '@root/services';
import request from 'supertest';

describe('POST /api/users/logout', () => {
    test('token is blacklisted', async () => {
        const { sessionToken } = await createUser('editor');

        await request(testKit.server)
            .post(testKit.endpoints.logout)
            .set('Authorization', `Bearer ${sessionToken}`)
            .expect(status2xx);

        const jwtService = new JwtService(testKit.jwtPrivateKey);
        const payload = jwtService.verify(sessionToken);
        const tokenJti = payload!.jti;

        const data = await testKit.redisService.get(tokenJti);
        expect(data).not.toBeNull();
    });

    test('return status 401 UNAUTHORIZED when trying to access other resources after logout', async () => {
        const { sessionToken } = await createUser('editor');
        const expectedStatus = 401;
        const expectedErrorMssg = 'Invalid bearer token';

        // Logout
        await request(testKit.server)
            .post(testKit.endpoints.logout)
            .set('Authorization', `Bearer ${sessionToken}`)
            .expect(status2xx);

        // Create task using a blacklisted token
        const response = await request(testKit.server)
            .post(testKit.endpoints.createTask)
            .set('Authorization', `Bearer ${sessionToken}`)            

        expect(response.body).toStrictEqual({ error: expectedErrorMssg });
        expect(response.statusCode).toBe(expectedStatus);
    });

    describe('Response - Success', () => {
        test('return status 204 NO CONTENT', async () => {
            const expectedStatus = 204;
            const { sessionToken } = await createUser('editor');

            const response = await request(testKit.server)
                .post(testKit.endpoints.logout)
                .set('Authorization', `Bearer ${sessionToken}`);

            expect(response.body).toStrictEqual({});
            expect(response.statusCode).toBe(expectedStatus);
        });
    });

    describe('Response - Failure', () => {
        test('return status 401 UNAUTHORIZED when using a blacklisted token to logout', async () => {
            const expectedStatus = 401;
            const expectedErrorMssg = 'Invalid bearer token';
            const { sessionToken } = await createUser('editor');

            // Logout 1 blacklists
            await request(testKit.server)
                .post(testKit.endpoints.logout)
                .set('Authorization', `Bearer ${sessionToken}`)
                .expect(status2xx);

            // Logout with the blacklisted token
            const response = await request(testKit.server)
                .post(testKit.endpoints.logout)
                .set('Authorization', `Bearer ${sessionToken}`);

            expect(response.body).toStrictEqual({ error: expectedErrorMssg });
            expect(response.statusCode).toBe(expectedStatus);
        });
    });
});