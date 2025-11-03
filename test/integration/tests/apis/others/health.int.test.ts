import request from 'supertest';
import { testKit } from '@integration/utils/testKit.util';
import { UserRole } from 'src/types/user/user-roles.type';
import { createUser } from '@integration/utils/createUser.util';
import { getRandomRole } from '@integration/utils/get-random-role.util';
import { authErrors } from 'src/common/errors/messages/auth.error.messages';

describe('GET /health', () => {
    describe('User is not an administrator', () => {
        const getNotAdminUser = (): UserRole => {
            let role = 'admin';
            while (role === 'admin')
                role = getRandomRole();
            return role as 'editor' | 'readonly';
        }

        test('return 403 FORBIDDEN', async () => {
            const expectedStatus = 403;
            const expectedErrorMssg = authErrors.FORBIDDEN;
            const { sessionToken } = await createUser(getNotAdminUser());
            const response = await request(testKit.server)
                .get(testKit.endpoints.health)
                .set('Authorization', `Bearer ${sessionToken}`);
            expect(response.body).toStrictEqual({ error: expectedErrorMssg });
            expect(response.statusCode).toBe(expectedStatus);
        });
    });

    test('return status 200 and server stats', async () => {
        const expectedStatus = 200;
        const { sessionToken } = await createUser('admin');
        const response = await request(testKit.server)
            .get(testKit.endpoints.health)
            .set('Authorization', `Bearer ${sessionToken}`);
        expect(response.statusCode).toBe(expectedStatus);
        expect(response.body).toStrictEqual({
            status: expect.anything(),
            uptime: expect.anything(),
            memoryUsage: expect.anything(),
            cpuUsage: expect.anything(),
            timestamp: expect.anything(),
        });
    });
});