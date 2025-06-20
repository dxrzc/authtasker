import request from 'supertest';
import { testKit } from '@integration/utils/testKit.util';
import { createUser } from '@integration/utils/createUser.util';
import { getRandomRole } from '@integration/utils/get-random-role.util';

describe('GET /api/users/me', () => {
    describe('Response', () => {
        test('return status 200 and the profile of the user in token', async () => {
            const expectedStatus = 200;
            const { sessionToken, userId, userEmail, userName } = await createUser(getRandomRole());
            const response = await request(testKit.server)
                .get(testKit.endpoints.myProfile)
                .set('Authorization', `Bearer ${sessionToken}`);

            expect(response.body).toStrictEqual(expect.objectContaining({
                name: userName,
                email: userEmail,
                id: userId
            }));
            expect(response.statusCode).toBe(expectedStatus);
        });
    });
});