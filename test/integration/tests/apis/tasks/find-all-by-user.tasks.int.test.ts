import request from 'supertest';
import { testKit } from '@integration/utils/testKit.util';
import { Types } from 'mongoose';
import { usersApiErrors } from '@root/common/errors/messages/users-api.error.messages';
import { createUser } from '@integration/utils/createUser.util';
import { getRandomRole } from '@integration/utils/get-random-role.util';
import { paginationErrors } from '@root/common/errors/messages/pagination.error.messages';
import { createUserMultipleTasks } from '@integration/utils/create-user-multiple-tasks-util';

describe('GET /api/tasks/allByUser/:id', () => {
    describe('User not found', () => {
        test('return status 404 NOT FOUND', async () => {
            const { sessionToken } = await createUser(getRandomRole());
            const expectedStatus = 404;
            const expectedErrorMssg = usersApiErrors.USER_NOT_FOUND;

            const mongoId = new Types.ObjectId();
            const response = await request(testKit.server)
                .get(`${testKit.endpoints.findAllTasksByUser}/${mongoId}`)
                .set('Authorization', `Bearer ${sessionToken}`);

            expect(response.statusCode).toBe(expectedStatus);
            expect(response.body).toStrictEqual({ error: expectedErrorMssg });
        });
    });

    describe('Invalid mongo id', () => {
        test('return status 404 NOT FOUND', async () => {
            const { sessionToken } = await createUser(getRandomRole());
            const expectedStatus = 404;
            const expectedErrorMssg = usersApiErrors.USER_NOT_FOUND;

            const invalidId = 'invalid-id';
            const response = await request(testKit.server)
                .get(`${testKit.endpoints.findAllTasksByUser}/${invalidId}`)
                .set('Authorization', `Bearer ${sessionToken}`);

            expect(response.statusCode).toBe(expectedStatus);
            expect(response.body).toStrictEqual({ error: expectedErrorMssg });
        });
    });

    describe('Pagination Rules Wiring', () => {
        test('return status 400 BAD REQUEST when page exceeds the max possible page for the documents count', async () => {
            const expectedStatus = 400;
            const expectedErrorMssg = paginationErrors.PAGE_TOO_LARGE;

            const { sessionToken } = await createUser('editor');
            await createUserMultipleTasks(sessionToken, 7);

            const limit = 3;
            const invalidPage = 5;

            const response = await request(testKit.server)
                .get(testKit.endpoints.usersAPI)
                .query({ page: invalidPage, limit })
                .set('Authorization', `Bearer ${sessionToken}`);

            expect(response.statusCode).toBe(expectedStatus);
            expect(response.body).toStrictEqual({ error: expectedErrorMssg });
        });
    });
});