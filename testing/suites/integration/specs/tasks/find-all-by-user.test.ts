import { testKit } from '@integration/kit/test.kit';
import { createTasksForUser } from '@integration/utils/create-tasks-for-user.util';
import { createUser } from '@integration/utils/create-user.util';
import { status2xx } from '@integration/utils/status-2xx.util';
import { getRandomRole } from '@test/tools/utilities/get-random-role.util';
import { Types } from 'mongoose';
import { UserRole } from 'src/enums/user-role.enum';
import { authErrors } from 'src/messages/auth.error.messages';
import { paginationErrors } from 'src/messages/pagination.error.messages';
import { usersApiErrors } from 'src/messages/users-api.error.messages';
import { TaskDocument } from 'src/types/tasks/task-document.type';

describe(`GET ${testKit.urls.findAllTasksByUser}/:id?limit=...&page=...`, () => {
    describe('Session cookie not provided', () => {
        test('return 401 status code and invalid token error message', async () => {
            const response = await testKit.agent.get(
                `${testKit.urls.findAllTasksByUser}/123?limit=${1}&page=${1}`,
            );
            expect(response.body).toStrictEqual({ error: authErrors.INVALID_TOKEN });
            expect(response.status).toBe(401);
        });
    });

    describe('User does not exist', () => {
        test('return 404 status code and user not found error message', async () => {
            const { sessionToken } = await createUser(getRandomRole());
            const response = await testKit.agent
                .get(
                    `${testKit.urls.findAllTasksByUser}/${new Types.ObjectId().toString()}?limit=${1}&page=${1}`,
                )
                .set('Authorization', `Bearer ${sessionToken}`);
            expect(response.body).toStrictEqual({ error: usersApiErrors.NOT_FOUND });
            expect(response.status).toBe(404);
        });
    });

    describe('Invalid mongo id', () => {
        test('return 404 status code and user not found error message', async () => {
            const invalidId = '123';
            const { sessionToken } = await createUser(getRandomRole());
            const response = await testKit.agent
                .get(`${testKit.urls.findAllTasksByUser}/${invalidId}?limit=${1}&page=${1}`)
                .set('Authorization', `Bearer ${sessionToken}`);
            expect(response.body).toStrictEqual({ error: usersApiErrors.NOT_FOUND });
            expect(response.status).toBe(404);
        });
    });

    describe('User does not have any tasks', () => {
        test('return 200 status code and empty array for data, 0 pages, 0 totalDocuments', async () => {
            const { sessionToken, id } = await createUser(getRandomRole());
            const response = await testKit.agent
                .get(`${testKit.urls.findAllTasksByUser}/${id}?limit=${1}&page=${1}`)
                .set('Authorization', `Bearer ${sessionToken}`);
            expect(response.body).toStrictEqual({
                totalDocuments: 0,
                totalPages: 0,
                currentPage: 1,
                data: [],
            });
            expect(response.status).toBe(200);
        });
    });

    describe('Limit is not number', () => {
        test('return 400 status code and invalid limit error message', async () => {
            const invalidLimit = 'A12####';
            const { sessionToken, id } = await createUser(getRandomRole());
            const response = await testKit.agent
                .get(`${testKit.urls.findAllTasksByUser}/${id}?limit=${invalidLimit}&page=${1}`)
                .set('Authorization', `Bearer ${sessionToken}`);
            expect(response.body).toStrictEqual({ error: paginationErrors.INVALID_LIMIT });
            expect(response.status).toBe(400);
        });
    });

    describe('Page is not a number', () => {
        test('return 400 status code and invalid page error message', async () => {
            const invalidPage = 'A12####';
            const { sessionToken, id } = await createUser(getRandomRole());
            const response = await testKit.agent
                .get(`${testKit.urls.findAllTasksByUser}/${id}?limit=${1}&page=${invalidPage}`)
                .set('Authorization', `Bearer ${sessionToken}`);
            expect(response.body).toStrictEqual({ error: paginationErrors.INVALID_PAGE });
            expect(response.status).toBe(400);
        });
    });

    describe('User has created several tasks', () => {
        test('data in pagination should work correctly and returning only the users tasks sorted by createdAt and _id', async () => {
            // simulate tasks for another user
            await createTasksForUser((await createUser(UserRole.EDITOR)).id, 10);
            // user to test
            const { sessionToken, id } = await createUser(UserRole.EDITOR);
            const nTasks = 4;
            const tasks = await createTasksForUser(id, nTasks);
            const expectedTasks = [...tasks]
                .sort((a, b) => {
                    if (a.createdAt.getTime() === b.createdAt.getTime())
                        return a._id.toString().localeCompare(b._id.toString());
                    return a.createdAt.getTime() - b.createdAt.getTime();
                })
                .map((t: TaskDocument) => ({
                    ...t.toJSON(),
                    createdAt: t.createdAt.toISOString(),
                    updatedAt: t.updatedAt.toISOString(),
                    id: t._id.toString(),
                    user: t.user.toString(),
                }));
            // Half of the tasks in page 1
            const res1 = await testKit.agent
                .get(`${testKit.urls.findAllTasksByUser}/${id}?limit=${nTasks / 2}&page=${1}`)
                .set('Authorization', `Bearer ${sessionToken}`)
                .expect(status2xx);
            expect(res1.body.data).toStrictEqual(expectedTasks.slice(0, nTasks / 2));
            // Other half of the tasks in page 2
            const res2 = await testKit.agent
                .get(`${testKit.urls.findAllTasksByUser}/${id}?limit=${nTasks / 2}&page=${2}`)
                .set('Authorization', `Bearer ${sessionToken}`)
                .expect(status2xx);
            expect(res2.body.data).toStrictEqual(expectedTasks.slice(nTasks / 2, nTasks));
        });

        test('cache all the tasks returned in page', async () => {
            const { sessionToken, id } = await createUser(UserRole.EDITOR);
            await createTasksForUser(id, 7); // total tasks
            const tasksReturned = 3;
            const response = await testKit.agent
                .get(`${testKit.urls.findAllTasksByUser}/${id}?limit=${tasksReturned}&page=${2}`)
                .set('Authorization', `Bearer ${sessionToken}`)
                .expect(status2xx);
            const tasksInResponseId = response.body.data.map((t: TaskDocument) => t.id);
            expect(tasksInResponseId).toHaveLength(tasksReturned);
            await Promise.all(
                tasksInResponseId.map(async (taskId: string) => {
                const inCache = await testKit.tasksCacheService.get(taskId);
                expect(inCache).not.toBeNull();
            }));
        });

        test('total documents should be only the number of tasks created by the user', async () => {
            // simulate tasks for other users
            await createTasksForUser((await createUser(UserRole.EDITOR)).id, 2);
            await createTasksForUser((await createUser(UserRole.EDITOR)).id, 2);
            // user to test
            const { sessionToken, id } = await createUser(UserRole.EDITOR);
            const nTasks = 5;
            await createTasksForUser(id, nTasks);
            const response = await testKit.agent
                .get(`${testKit.urls.findAllTasksByUser}/${id}?limit=${2}&page=${1}`)
                .set('Authorization', `Bearer ${sessionToken}`);
            expect(response.body.totalDocuments).toBe(nTasks);
        });

        describe('One of the tasks is already in cache', () => {
            test('return the data in cache for the task', async () => {
                const { sessionToken, id } = await createUser(UserRole.EDITOR);
                const tasks = await createTasksForUser(id, 5);
                const randomTask = tasks[2];
                // change something to be able to notice if comes from cache
                randomTask.name = 'This name indicates that the task came from cache';
                await testKit.tasksCacheService.cache(randomTask);
                const response = await testKit.agent
                    .get(`${testKit.urls.findAllTasksByUser}/${id}?limit=${5}&page=${1}`)
                    .set('Authorization', `Bearer ${sessionToken}`)
                    .expect(status2xx);
                const taskFromResponse = response.body.data.find(
                    (t: TaskDocument) => t.id === randomTask._id.toString(),
                );
                expect(taskFromResponse.name).toBe(
                    'This name indicates that the task came from cache',
                );
            });
        });

        test('total pages should be the number of tasks divided by the provided limit', async () => {
            const { sessionToken, id } = await createUser(UserRole.EDITOR);
            const nTasks = 7;
            await createTasksForUser(id, nTasks);
            const limit = 2;
            const response = await testKit.agent
                .get(`${testKit.urls.findAllTasksByUser}/${id}?limit=${2}&page=${1}`)
                .set('Authorization', `Bearer ${sessionToken}`);
            const expectedTotalPages = Math.ceil(nTasks / limit);
            expect(response.body.totalPages).toBe(expectedTotalPages);
        });
    });
});
