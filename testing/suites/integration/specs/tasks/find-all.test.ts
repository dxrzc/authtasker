import { testKit } from '@integration/kit/test.kit';
import { createTasksForUser } from '@integration/utils/create-tasks-for-user.util';
import { createUser } from '@integration/utils/create-user.util';
import { status2xx } from '@integration/utils/status-2xx.util';
import { getRandomRole } from '@test/tools/utilities/get-random-role.util';
import { UserRole } from 'src/enums/user-role.enum';
import { authErrors } from 'src/messages/auth.error.messages';
import { paginationErrors } from 'src/messages/pagination.error.messages';
import { TaskDocument } from 'src/types/tasks/task-document.type';

describe(`GET ${testKit.urls.tasksAPI}?limit=...&page=...`, () => {
    describe('Session cookie not provided', () => {
        test('return 401 status code and invalid token error message', async () => {
            const response = await testKit.agent.get(
                `${testKit.urls.tasksAPI}?limit=${1}&page=${1}`,
            );
            expect(response.body).toStrictEqual({ error: authErrors.INVALID_TOKEN });
            expect(response.status).toBe(401);
        });
    });

    describe('Limit is not number', () => {
        test('return 400 status code and invalid limit error message', async () => {
            const invalidLimit = 'A12####';
            const { sessionToken } = await createUser(getRandomRole());
            const response = await testKit.agent
                .get(`${testKit.urls.tasksAPI}?limit=${invalidLimit}&page=${1}`)
                .set('Authorization', `Bearer ${sessionToken}`);
            expect(response.body).toStrictEqual({ error: paginationErrors.INVALID_LIMIT });
            expect(response.status).toBe(400);
        });
    });

    describe('Page is not a number', () => {
        test('return 400 status code and invalid page error message', async () => {
            const invalidPage = 'A12####';
            const { sessionToken } = await createUser(getRandomRole());
            const response = await testKit.agent
                .get(`${testKit.urls.tasksAPI}?limit=${1}&page=${invalidPage}`)
                .set('Authorization', `Bearer ${sessionToken}`);
            expect(response.body).toStrictEqual({ error: paginationErrors.INVALID_PAGE });
            expect(response.status).toBe(400);
        });
    });

    describe('Several tasks created', () => {
        test('data in pagination should work correctly and returning all tasks sorted by createdAt and _id', async () => {
            // create tasks for multiple users
            const user1 = await createUser(UserRole.EDITOR);
            const user2 = await createUser(UserRole.EDITOR);
            await createTasksForUser(user1.id, 5);
            await createTasksForUser(user2.id, 5);

            const allTasks = await testKit.models.task.find().exec();
            const expectedTasks = allTasks
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
            const nTasks = allTasks.length;
            const { sessionToken } = await createUser(UserRole.READONLY);
            // Half of the tasks in page 1
            const res1 = await testKit.agent
                .get(`${testKit.urls.tasksAPI}?limit=${Math.ceil(nTasks / 2)}&page=${1}`)
                .set('Authorization', `Bearer ${sessionToken}`)
                .expect(status2xx);
            expect(res1.body.data).toStrictEqual(expectedTasks.slice(0, Math.ceil(nTasks / 2)));
            // Other half of the tasks in page 2
            const res2 = await testKit.agent
                .get(`${testKit.urls.tasksAPI}?limit=${Math.ceil(nTasks / 2)}&page=${2}`)
                .set('Authorization', `Bearer ${sessionToken}`)
                .expect(status2xx);
            expect(res2.body.data).toStrictEqual(
                expectedTasks.slice(Math.ceil(nTasks / 2), nTasks),
            );
        });

        test('cache all the tasks returned in page', async () => {
            const { id } = await createUser(UserRole.EDITOR);
            await createTasksForUser(id, 7); // total tasks
            const tasksReturned = 3;
            const { sessionToken } = await createUser(UserRole.READONLY);
            const response = await testKit.agent
                .get(`${testKit.urls.tasksAPI}?limit=${tasksReturned}&page=${2}`)
                .set('Authorization', `Bearer ${sessionToken}`)
                .expect(status2xx);
            const tasksInResponseId = response.body.data.map((t: TaskDocument) => t.id);
            expect(tasksInResponseId).toHaveLength(tasksReturned);
            await Promise.all(tasksInResponseId.map(async (taskId: string) => {
                const inCache = await testKit.tasksCacheService.get(taskId);
                expect(inCache).not.toBeNull();
            }));
        });

        test('total documents should be the total number of tasks', async () => {
            const totalTasks = await testKit.models.task.countDocuments().exec();
            const { sessionToken } = await createUser(UserRole.READONLY);
            const response = await testKit.agent
                .get(`${testKit.urls.tasksAPI}?limit=${2}&page=${1}`)
                .set('Authorization', `Bearer ${sessionToken}`);
            expect(response.body.totalDocuments).toBe(totalTasks);
        });

        describe('One of the tasks is already in cache', () => {
            test('return the data in cache for the task', async () => {
                const { id } = await createUser(UserRole.EDITOR);
                const tasks = await createTasksForUser(id, 5);
                const randomTask = tasks[2];
                // change something to be able to notice if comes from cache
                randomTask.name = 'This name indicates that the task came from cache';
                await testKit.tasksCacheService.cache(randomTask);
                const { sessionToken } = await createUser(UserRole.READONLY);
                const response = await testKit.agent
                    .get(`${testKit.urls.tasksAPI}?limit=${100}&page=${1}`)
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
            const { id } = await createUser(UserRole.EDITOR);
            await createTasksForUser(id, 7);
            const nTasks = await testKit.models.task.countDocuments().exec();
            const limit = 2;
            const { sessionToken } = await createUser(UserRole.READONLY);
            const response = await testKit.agent
                .get(`${testKit.urls.tasksAPI}?limit=${2}&page=${1}`)
                .set('Authorization', `Bearer ${sessionToken}`);
            const expectedTotalPages = Math.ceil(nTasks / limit);
            expect(response.body.totalPages).toBe(expectedTotalPages);
        });
    });
});
