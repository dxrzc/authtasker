import { Types } from 'mongoose';
import request from 'supertest';
import { createUser, testKit } from '@integration/utils';

describe('GET /api/users/:id', () => {
    describe('Response - Success', () => {
        test.concurrent('return status 200 OK and the correct and safe user data', async () => {
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

    describe('Response - Failure', () => {
        test.concurrent('return status 404 NOT FOUND when user is not found', async () => {
            const mongoId = new Types.ObjectId();
            const { sessionToken } = await createUser('readonly');

            const expectedStatus = 404;
            const expectedErrorMssg = `User with id ${mongoId} not found`;

            const response = await request(testKit.server)
                .get(`${testKit.endpoints.usersAPI}/${mongoId}`)
                .set('Authorization', `Bearer ${sessionToken}`);

            expect(response.body).toStrictEqual({ error: expectedErrorMssg });
            expect(response.statusCode).toBe(expectedStatus);
        });

        test.concurrent('return status 404 NOT FOUND even when id is not a valid', async () => {
            const invalidMongoId = '12345';
            const { sessionToken } = await createUser('readonly');

            const expectedStatus = 404;
            const expectedErrorMssg = `User with id ${invalidMongoId} not found`;

            const response = await request(testKit.server)
                .get(`${testKit.endpoints.usersAPI}/${invalidMongoId}`)
                .set('Authorization', `Bearer ${sessionToken}`);

            expect(response.body).toStrictEqual({ error: expectedErrorMssg });
            expect(response.statusCode).toBe(expectedStatus);
        });
    });
});