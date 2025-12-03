import { testKit } from '@integration/kit/test.kit';
import { createTasksWithPriority } from '@integration/utils/create-tasks-with-priority.util';
import { createUser } from '@integration/utils/create-user.util';
import { status2xx } from '@integration/utils/status-2xx.util';
import { getRandomRole } from '@test/tools/utilities/get-random-role.util';
import { UserRole } from 'src/enums/user-role.enum';
import { authErrors } from 'src/messages/auth.error.messages';
import { paginationErrors } from 'src/messages/pagination.error.messages';
import { tasksApiErrors } from 'src/messages/tasks-api.error.messages';
import { TaskDocument } from 'src/types/tasks/task-document.type';
import { tasksPriority } from 'src/types/tasks/task-priority.type';

describe(`GET ${testKit.urls.findAllTasksByPriority}/:priority?limit=...&page=...`, () => {
    describe('Session cookie not provided', () => {
        test('return 401 status code and invalid token error message', async () => {
            const response = await testKit.agent.get(
                `${testKit.urls.findAllTasksByPriority}/low?limit=${1}&page=${1}`,
            );
            expect(response.body).toStrictEqual({ error: authErrors.INVALID_TOKEN });
            expect(response.status).toBe(401);
        });
    });

    describe('Invalid priority', () => {
        test('return 400 status code and invalid priority error message', async () => {
            const invalidPriority = 'invalid-priority';
            const { sessionToken } = await createUser(getRandomRole());
            const response = await testKit.agent
                .get(
                    `${testKit.urls.findAllTasksByPriority}/${invalidPriority}?limit=${1}&page=${1}`,
                )
                .set('Authorization', `Bearer ${sessionToken}`);
            expect(response.body).toStrictEqual({ error: tasksApiErrors.INVALID_PRIORITY });
            expect(response.status).toBe(400);
        });
    });

    describe('Limit is not number', () => {
        test('return 400 status code and invalid limit error message', async () => {
            const invalidLimit = 'A12####';
            const { sessionToken } = await createUser(getRandomRole());
            const response = await testKit.agent
                .get(`${testKit.urls.findAllTasksByPriority}/low?limit=${invalidLimit}&page=${1}`)
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
                .get(`${testKit.urls.findAllTasksByPriority}/low?limit=${1}&page=${invalidPage}`)
                .set('Authorization', `Bearer ${sessionToken}`);
            expect(response.body).toStrictEqual({ error: paginationErrors.INVALID_PAGE });
            expect(response.status).toBe(400);
        });
    });

    describe('Tasks exist with various priorities', () => {
        test('data in pagination should work correctly and returning only tasks with matching priority sorted by createdAt and _id', async () => {
            const { sessionToken, id } = await createUser(UserRole.EDITOR);
            // Create tasks with the priority we'll query
            await createTasksWithPriority(id, 'high', 4);

            // Get all high priority tasks from DB
            const allHighPriorityTasks = await testKit.models.task
                .find({ priority: 'high' })
                .exec();
            const expectedTasks = [...allHighPriorityTasks]
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

            const nTasks = expectedTasks.length;
            const limit = Math.ceil(nTasks / 2);

            // First half of the tasks in page 1
            const res1 = await testKit.agent
                .get(`${testKit.urls.findAllTasksByPriority}/high?limit=${limit}&page=${1}`)
                .set('Authorization', `Bearer ${sessionToken}`)
                .expect(status2xx);
            expect(res1.body.data).toStrictEqual(expectedTasks.slice(0, limit));

            // Second half of the tasks in page 2
            const res2 = await testKit.agent
                .get(`${testKit.urls.findAllTasksByPriority}/high?limit=${limit}&page=${2}`)
                .set('Authorization', `Bearer ${sessionToken}`)
                .expect(status2xx);
            expect(res2.body.data).toStrictEqual(expectedTasks.slice(limit, nTasks));
        });

        test('cache all the tasks returned in page', async () => {
            const { sessionToken, id } = await createUser(UserRole.EDITOR);
            await createTasksWithPriority(id, 'medium', 7);
            const tasksReturned = 3;
            const response = await testKit.agent
                .get(
                    `${testKit.urls.findAllTasksByPriority}/medium?limit=${tasksReturned}&page=${2}`,
                )
                .set('Authorization', `Bearer ${sessionToken}`)
                .expect(status2xx);
            const tasksInResponseId = response.body.data.map((t: TaskDocument) => t.id);
            expect(tasksInResponseId).toHaveLength(tasksReturned);
            await Promise.all(
                tasksInResponseId.map(async (taskId: string) => {
                    const inCache = await testKit.tasksCacheService.get(taskId);
                    expect(inCache).not.toBeNull();
                }),
            );
        });

        test('total documents should be the number of tasks with matching priority', async () => {
            const { sessionToken, id } = await createUser(UserRole.EDITOR);
            // Create some low priority tasks
            await createTasksWithPriority(id, 'low', 5);
            const totalLowPriorityTasks = await testKit.models.task
                .countDocuments({ priority: 'low' })
                .exec();
            const response = await testKit.agent
                .get(`${testKit.urls.findAllTasksByPriority}/low?limit=${2}&page=${1}`)
                .set('Authorization', `Bearer ${sessionToken}`);
            expect(response.body.totalDocuments).toBe(totalLowPriorityTasks);
        });

        describe('One of the tasks is already in cache', () => {
            test('return the data in cache for the task', async () => {
                const { sessionToken, id } = await createUser(UserRole.EDITOR);
                const tasks = await createTasksWithPriority(id, 'high', 5);
                const randomTask = tasks[2];
                // change something to be able to notice if comes from cache
                randomTask.name = 'This name indicates that the task came from cache';
                await testKit.tasksCacheService.cache(randomTask);
                const response = await testKit.agent
                    .get(`${testKit.urls.findAllTasksByPriority}/high?limit=${100}&page=${1}`)
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
            await createTasksWithPriority(id, 'low', 7);
            const nTasks = await testKit.models.task.countDocuments({ priority: 'low' }).exec();
            const limit = 2;
            const response = await testKit.agent
                .get(`${testKit.urls.findAllTasksByPriority}/low?limit=${2}&page=${1}`)
                .set('Authorization', `Bearer ${sessionToken}`);
            const expectedTotalPages = Math.ceil(nTasks / limit);
            expect(response.body.totalPages).toBe(expectedTotalPages);
        });

        test('page beyond available data returns empty data array', async () => {
            const { sessionToken, id } = await createUser(UserRole.EDITOR);
            await createTasksWithPriority(id, 'medium', 3);
            const totalMediumPriorityTasks = await testKit.models.task
                .countDocuments({ priority: 'medium' })
                .exec();
            // Request a page that's beyond available data
            const response = await testKit.agent
                .get(`${testKit.urls.findAllTasksByPriority}/medium?limit=${2}&page=${100}`)
                .set('Authorization', `Bearer ${sessionToken}`)
                .expect(status2xx);
            expect(response.body.data).toStrictEqual([]);
            expect(response.body.totalDocuments).toBe(totalMediumPriorityTasks);
        });
    });

    describe('All valid priority values work', () => {
        test.each(tasksPriority)('should accept priority "%s"', async (priority) => {
            const { sessionToken, id } = await createUser(UserRole.EDITOR);
            await createTasksWithPriority(id, priority, 2);
            const totalTasksWithPriority = await testKit.models.task
                .countDocuments({ priority })
                .exec();
            const response = await testKit.agent
                .get(`${testKit.urls.findAllTasksByPriority}/${priority}?limit=${100}&page=${1}`)
                .set('Authorization', `Bearer ${sessionToken}`)
                .expect(status2xx);
            expect(response.body.totalDocuments).toBe(totalTasksWithPriority);
            expect(response.body.totalDocuments).toBeGreaterThanOrEqual(2);
        });
    });
});
