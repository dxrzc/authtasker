import { Types } from 'mongoose';
import request from 'supertest';
import { createUser, testKit } from '@integration/utils';

describe('GET /api/users/:id', () => {
    describe('Response', () => {
        test.concurrent('return 200 OK and correct data (same data, no password, etc)', async () => {
            const expectedStatus = 200;

            const { userId, sessionToken } = await createUser('readonly');

            const response = await request(testKit.server)
                .get(`${testKit.endpoints.usersAPI}/${userId}`)
                .set('Authorization', `Bearer ${sessionToken}`);

            const userInDb = await testKit.userModel.findById(userId);
            expect(response.statusCode).toBe(expectedStatus);
            expect(response.body).toStrictEqual({
                name: userInDb!.name,
                email: userInDb!.email,
                role: userInDb!.role,
                emailValidated: userInDb!.emailValidated,
                createdAt: userInDb!.createdAt.toISOString(),
                updatedAt: userInDb!.updatedAt.toISOString(),
                id: userInDb!.id,
            });
        });
    });
});