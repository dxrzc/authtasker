import { Types } from 'mongoose';
import request from 'supertest';
import { usersApiErrors } from '@root/common/errors/messages';
import { createUser, testKit } from '@integration/utils';

const cases = ['get', 'patch', 'delete'] as const;

describe('404 NOT FOUND - User not found', () => {
    test.concurrent.each(
        cases
    )('%s /api/users/:id return 404 NOT FOUND when user does not exist', async (method) => {
        const expectedStatus = 404;
        const mongoId = new Types.ObjectId();
        const expectedErrorMssg = usersApiErrors.USER_NOT_FOUND;

        const { sessionToken } = await createUser('editor');

        const promise = request(testKit.server)[method](`${testKit.endpoints.usersAPI}/${mongoId}`)
            .set('Authorization', `Bearer ${sessionToken}`)

        if (method === 'patch') // send something in update case
            promise.send({ name: testKit.userDataGenerator.name() });

        const { body, statusCode } = await promise;
        expect(body).toStrictEqual({ error: expectedErrorMssg });
        expect(statusCode).toBe(expectedStatus);
    });

    test.concurrent.each(
        cases
    )('%s /api/users/:id return 404 NOT FOUND for invalid mongoId', async (method) => {
        const expectedStatus = 404;
        const invalidMongoId = '12345';
        const expectedErrorMssg = usersApiErrors.USER_NOT_FOUND;

        const { sessionToken } = await createUser('editor');

        const promise = request(testKit.server)[method](`${testKit.endpoints.usersAPI}/${invalidMongoId}`)
            .set('Authorization', `Bearer ${sessionToken}`)

        if (method === 'patch') // send something in update case
            promise.send({ name: testKit.userDataGenerator.name() });

        const { body, statusCode } = await promise;
        expect(body).toStrictEqual({ error: expectedErrorMssg });
        expect(statusCode).toBe(expectedStatus);
    });
});
