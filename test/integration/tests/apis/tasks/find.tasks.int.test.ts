import request from 'supertest';
import { createUser, testKit } from '@integration/utils';
import { createTask } from '@integration/utils/createTask.util';
import { errorMessages } from '@root/common/errors/messages';

describe('GET /api/tasks/', () => {
    let tasksIdSorted = new Array<string>();
    let sessionToken: string;

    beforeAll(async () => {
        sessionToken = (await createUser('readonly')).sessionToken;

        const { sessionToken: user1SessionToken } = await createUser('editor');
        const { sessionToken: user2SessionToken } = await createUser('admin');

        // Create 7 tasks for user1
        for (let i = 0; i < 7; i++) {
            const { taskId } = await createTask(user1SessionToken);
            tasksIdSorted.push(taskId);
        }

        // Create 7 tasks for user2
        for (let i = 0; i < 7; i++) {
            const { taskId } = await createTask(user2SessionToken);
            tasksIdSorted.push(taskId);
        }

        // One more for user1
        tasksIdSorted.push((await createTask(user1SessionToken)).taskId)
    });

    describe('Pagination Rules Wiring', () => {
        test('return status 400 BAD REQUEST when page exceeds the max possible page for the documents count', async () => {
            const expectedStatus = 400;
            const expectedErrorMssg = errorMessages.PAG_PAGE_TOO_LARGE;
            const { sessionToken } = await createUser('readonly');

            const documentsCount = await testKit.tasksModel.countDocuments();
            const limit = 10;
            const invalidPage = Math.ceil(documentsCount / limit) + 1;

            const response = await request(testKit.server)
                .get(testKit.endpoints.tasksAPI)
                .query({ page: invalidPage, limit })
                .set('Authorization', `Bearer ${sessionToken}`);

            expect(response.statusCode).toBe(expectedStatus);
            expect(response.body).toStrictEqual({ error: expectedErrorMssg });
        });
    });

    describe('Response', () => {
        test('return 200 OK and the expected tasks with the expected and correct data', async () => {
            const expectedStatus = 200;

            const page = 4;
            const limit = 3;

            const response = await request(testKit.server)
                .get(testKit.endpoints.tasksAPI)
                .query({ page, limit })
                .set('Authorization', `Bearer ${sessionToken}`);

            expect(response.body).toBeInstanceOf(Array);
            expect(response.body.length).toBe(limit);

            // compare every task
            const initialIndex = limit * (page - 1);
            let currentIndexInBody = 0;
            for (let i = initialIndex; i < initialIndex + limit; i++) {
                const taskInDb = await testKit.tasksModel.findById(tasksIdSorted[i]);
                expect(taskInDb).not.toBeNull();

                const taskInBody = response.body[currentIndexInBody++];
                expect(taskInBody).toBeDefined();

                expect(taskInBody).toStrictEqual({
                    name: taskInDb!.name,
                    description: taskInDb!.description,
                    status: taskInDb!.status,
                    priority: taskInDb!.priority,
                    user: taskInDb!.user.toString(),
                    createdAt: taskInDb!.createdAt.toISOString(),
                    updatedAt: taskInDb!.updatedAt.toISOString(),
                    id: taskInDb!.id,
                });
            }
            expect(response.statusCode).toBe(expectedStatus);
        });
    });
});