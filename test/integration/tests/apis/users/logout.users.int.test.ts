import request from 'supertest';
import { testKit } from '@integration/utils/testKit.util';
import { status2xx } from '@integration/utils/status2xx.util';
import { createUser } from '@integration/utils/createUser.util';
import { makeSessionTokenBlacklistKey } from '@logic/token/make-session-token-blacklist-key';

describe('POST /api/users/logout', () => {
    describe('Token operations', () => {
        test.concurrent('session token is blacklisted after logout', async () => {
            const { sessionToken } = await createUser('editor');

            // logout
            await request(testKit.server)
                .post(testKit.endpoints.logout)
                .set('Authorization', `Bearer ${sessionToken}`)
                .expect(status2xx);

            const payload = testKit.jwtService.verify(sessionToken);
            const jti = payload!.jti!;

            // expect session token in blacklist
            const token = await testKit.redisService.get(makeSessionTokenBlacklistKey(jti));
            expect(token).not.toBeNull();
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