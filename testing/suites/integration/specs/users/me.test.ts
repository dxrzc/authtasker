import { testKit } from '@integration/kit/test.kit';
import { createUser } from '@integration/utils/create-user.util';
import { getRandomRole } from '@test/tools/utilities/get-random-role.util';
import { authErrors } from 'src/messages/auth.error.messages';

describe('GET /api/users/me', () => {
    test('return status 200 and the profile of the user in token', async () => {
        const { sessionToken, id, email, name } = await createUser(getRandomRole());
        const response = await testKit.agent
            .get(testKit.urls.myProfile)
            .set('Authorization', `Bearer ${sessionToken}`);
        expect(response.body).toStrictEqual(expect.objectContaining({ email, id, name }));
        expect(response.statusCode).toBe(200);
    });

    describe('Session token not provided', () => {
        test(`should return 401 status code and ${authErrors.INVALID_TOKEN} message`, async () => {
            const response = await testKit.agent.get(testKit.urls.myProfile);
            expect(response.statusCode).toBe(401);
            expect(response.body).toStrictEqual({ error: authErrors.INVALID_TOKEN });
        });
    });
});
