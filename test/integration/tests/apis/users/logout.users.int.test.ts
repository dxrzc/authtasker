import request from 'supertest';
import { createUser, status2xx, testKit } from '@integration/utils';
import { JwtService } from '@root/services';

describe('POST /api/users/logout', () => {
    describe('Token operations', () => {
        test.concurrent('token is blacklisted after logout', async () => {
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
    });

    describe('Response', () => {
        test.concurrent('return 204 NO CONTENT', async () => {
            const expectedStatus = 204;
            const { sessionToken } = await createUser('editor');

            const response = await request(testKit.server)
                .post(testKit.endpoints.logout)
                .set('Authorization', `Bearer ${sessionToken}`);

            expect(response.body).toStrictEqual({});
            expect(response.statusCode).toBe(expectedStatus);
        });
    });
});