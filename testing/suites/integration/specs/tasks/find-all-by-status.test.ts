import { testKit } from '@integration/kit/test.kit';
import { createTasksWithStatus } from '@integration/utils/create-tasks-with-status.util';
import { createUser } from '@integration/utils/create-user.util';
import { status2xx } from '@integration/utils/status-2xx.util';
import { getRandomRole } from '@test/tools/utilities/get-random-role.util';
import { UserRole } from 'src/enums/user-role.enum';
import { authErrors } from 'src/messages/auth.error.messages';
import { paginationErrors } from 'src/messages/pagination.error.messages';
import { tasksApiErrors } from 'src/messages/tasks-api.error.messages';
import { TaskDocument } from 'src/types/tasks/task-document.type';
import { tasksStatus } from 'src/types/tasks/task-status.type';

describe(`GET ${testKit.urls.findAllTasksByStatus}/:status?limit=...&page=...`, () => {
    describe('Session cookie not provided', () => {
        test('return 401 status code and invalid token error message', async () => {
            const response = await testKit.agent.get(
                `${testKit.urls.findAllTasksByStatus}/pending?limit=${1}&page=${1}`,
            );
            expect(response.body).toStrictEqual({ error: authErrors.INVALID_TOKEN });
            expect(response.status).toBe(401);
        });
    });

    describe('Invalid status', () => {
        test('return 400 status code and invalid status error message', async () => {
            const invalidStatus = 'invalid-status';
            const { sessionToken } = await createUser(getRandomRole());
            const response = await testKit.agent
                .get(`${testKit.urls.findAllTasksByStatus}/${invalidStatus}?limit=${1}&page=${1}`)
                .set('Authorization', `Bearer ${sessionToken}`);
            expect(response.body).toStrictEqual({ error: tasksApiErrors.INVALID_STATUS });
            expect(response.status).toBe(400);
        });
    });

    describe('No tasks with matching status', () => {
        test('return 200 status code and empty array for data, 0 pages, 0 totalDocuments', async () => {
            const { sessionToken, id } = await createUser(UserRole.EDITOR);
            // Create tasks with different statuses
            await createTasksWithStatus(id, 'pending', 2);
            await createTasksWithStatus(id, 'in progress', 2);
            // Query for completed status which doesn't exist
            const response = await testKit.agent
                .get(`${testKit.urls.findAllTasksByStatus}/completed?limit=${10}&page=${1}`)
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
            const { sessionToken } = await createUser(getRandomRole());
            const response = await testKit.agent
                .get(`${testKit.urls.findAllTasksByStatus}/pending?limit=${invalidLimit}&page=${1}`)
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
                .get(`${testKit.urls.findAllTasksByStatus}/pending?limit=${1}&page=${invalidPage}`)
                .set('Authorization', `Bearer ${sessionToken}`);
            expect(response.body).toStrictEqual({ error: paginationErrors.INVALID_PAGE });
            expect(response.status).toBe(400);
        });
    });

    describe('Tasks exist with various statuses', () => {
        test('data in pagination should work correctly and returning only tasks with matching status sorted by createdAt and _id', async () => {
            const { sessionToken, id } = await createUser(UserRole.EDITOR);
            // Create tasks with the status we'll query
            await createTasksWithStatus(id, 'archived', 4);

            // Get all archived tasks from DB
            const allArchivedTasks = await testKit.models.task.find({ status: 'archived' }).exec();
            const expectedTasks = [...allArchivedTasks]
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
                .get(`${testKit.urls.findAllTasksByStatus}/archived?limit=${limit}&page=${1}`)
                .set('Authorization', `Bearer ${sessionToken}`)
                .expect(status2xx);
            expect(res1.body.data).toStrictEqual(expectedTasks.slice(0, limit));

            // Second half of the tasks in page 2
            const res2 = await testKit.agent
                .get(`${testKit.urls.findAllTasksByStatus}/archived?limit=${limit}&page=${2}`)
                .set('Authorization', `Bearer ${sessionToken}`)
                .expect(status2xx);
            expect(res2.body.data).toStrictEqual(expectedTasks.slice(limit, nTasks));
        });

        test('cache all the tasks returned in page', async () => {
            const { sessionToken, id } = await createUser(UserRole.EDITOR);
            await createTasksWithStatus(id, 'in progress', 7);
            const tasksReturned = 3;
            const response = await testKit.agent
                .get(
                    `${testKit.urls.findAllTasksByStatus}/in progress?limit=${tasksReturned}&page=${2}`,
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

        test('total documents should be the number of tasks with matching status', async () => {
            const { sessionToken, id } = await createUser(UserRole.EDITOR);
            // Create some completed tasks
            await createTasksWithStatus(id, 'completed', 5);
            const totalCompletedTasks = await testKit.models.task
                .countDocuments({ status: 'completed' })
                .exec();
            const response = await testKit.agent
                .get(`${testKit.urls.findAllTasksByStatus}/completed?limit=${2}&page=${1}`)
                .set('Authorization', `Bearer ${sessionToken}`);
            expect(response.body.totalDocuments).toBe(totalCompletedTasks);
        });

        describe('One of the tasks is already in cache', () => {
            test('return the data in cache for the task', async () => {
                const { sessionToken, id } = await createUser(UserRole.EDITOR);
                const tasks = await createTasksWithStatus(id, 'pending', 5);
                const randomTask = tasks[2];
                // change something to be able to notice if comes from cache
                randomTask.name = 'This name indicates that the task came from cache';
                await testKit.tasksCacheService.cache(randomTask);
                const response = await testKit.agent
                    .get(`${testKit.urls.findAllTasksByStatus}/pending?limit=${100}&page=${1}`)
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
            await createTasksWithStatus(id, 'pending', 7);
            const nTasks = await testKit.models.task.countDocuments({ status: 'pending' }).exec();
            const limit = 2;
            const response = await testKit.agent
                .get(`${testKit.urls.findAllTasksByStatus}/pending?limit=${2}&page=${1}`)
                .set('Authorization', `Bearer ${sessionToken}`);
            const expectedTotalPages = Math.ceil(nTasks / limit);
            expect(response.body.totalPages).toBe(expectedTotalPages);
        });

        test('page beyond available data returns empty data array', async () => {
            const { sessionToken, id } = await createUser(UserRole.EDITOR);
            await createTasksWithStatus(id, 'pending', 3);
            const totalPendingTasks = await testKit.models.task
                .countDocuments({ status: 'pending' })
                .exec();
            // Request a page that's beyond available data
            const response = await testKit.agent
                .get(`${testKit.urls.findAllTasksByStatus}/pending?limit=${2}&page=${100}`)
                .set('Authorization', `Bearer ${sessionToken}`)
                .expect(status2xx);
            expect(response.body.data).toStrictEqual([]);
            expect(response.body.totalDocuments).toBe(totalPendingTasks);
        });
    });

    describe('All valid status values work', () => {
        test.each(tasksStatus)('should accept status "%s"', async (status) => {
            const { sessionToken, id } = await createUser(UserRole.EDITOR);
            await createTasksWithStatus(id, status, 2);
            const totalTasksWithStatus = await testKit.models.task
                .countDocuments({ status })
                .exec();
            const response = await testKit.agent
                .get(`${testKit.urls.findAllTasksByStatus}/${status}?limit=${100}&page=${1}`)
                .set('Authorization', `Bearer ${sessionToken}`)
                .expect(status2xx);
            expect(response.body.totalDocuments).toBe(totalTasksWithStatus);
            expect(response.body.totalDocuments).toBeGreaterThanOrEqual(2);
        });
    });
});
