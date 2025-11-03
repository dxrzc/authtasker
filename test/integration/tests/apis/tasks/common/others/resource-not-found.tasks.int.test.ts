import request from 'supertest';
import { Types } from 'mongoose';
import { testKit } from '@integration/utils/testKit.util';
import { createUser } from '@integration/utils/createUser.util';
import { tasksApiErrors } from 'src/common/errors/messages/tasks-api.error.messages';

const cases = ['get', 'patch', 'delete'] as const;

describe('404 NOT FOUND - Task not found', () => {
    test.concurrent.each(cases)(
        '%s /api/tasks/:id return 404 NOT FOUND when task does not exist',
        async (method) => {
            const expectedStatus = 404;
            const mongoId = new Types.ObjectId();
            const expectedErrorMssg = tasksApiErrors.TASK_NOT_FOUND;

            const { sessionToken } = await createUser('editor');

            const promise = request(testKit.server)
                [method](`${testKit.endpoints.tasksAPI}/${mongoId}`)
                .set('Authorization', `Bearer ${sessionToken}`);

            if (method === 'patch')
                // send something in update case
                promise.send({ name: testKit.tasksDataGenerator.name() });

            const { body, statusCode } = await promise;
            expect(body).toStrictEqual({ error: expectedErrorMssg });
            expect(statusCode).toBe(expectedStatus);
        },
    );

    test.concurrent.each(cases)(
        '%s /api/tasks/:id return 404 NOT FOUND for invalid mongoId',
        async (method) => {
            const expectedStatus = 404;
            const invalidMongoId = '12345';
            const expectedErrorMssg = tasksApiErrors.TASK_NOT_FOUND;

            const { sessionToken } = await createUser('editor');

            const promise = request(testKit.server)
                [method](`${testKit.endpoints.tasksAPI}/${invalidMongoId}`)
                .set('Authorization', `Bearer ${sessionToken}`);

            if (method === 'patch')
                // send something in update case
                promise.send({ name: testKit.tasksDataGenerator.name() }); // update case

            const { body, statusCode } = await promise;
            expect(body).toStrictEqual({ error: expectedErrorMssg });
            expect(statusCode).toBe(expectedStatus);
        },
    );
});
