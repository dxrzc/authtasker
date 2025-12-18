import { testKit } from '@integration/kit/test.kit';
import { createTasksForUser } from '@integration/utils/create-tasks-for-user.util';
import { createUser } from '@integration/utils/create-user.util';
import { createTasksWithStatus } from '@integration/utils/create-tasks-with-status.util';
import { createTasksWithPriority } from '@integration/utils/create-tasks-with-priority.util';
import { status2xx } from '@integration/utils/status-2xx.util';
import { getRandomRole } from '@test/tools/utilities/get-random-role.util';
import { Types } from 'mongoose';
import { UserRole } from 'src/enums/user-role.enum';
import { authErrors } from 'src/messages/auth.error.messages';
import { paginationErrors } from 'src/messages/pagination.error.messages';
import { usersApiErrors } from 'src/messages/users-api.error.messages';
import { tasksApiErrors } from 'src/messages/tasks-api.error.messages';
import { TaskDocument } from 'src/types/tasks/task-document.type';
import { tasksStatus } from 'src/types/tasks/task-status.type';
import { tasksPriority } from 'src/types/tasks/task-priority.type';

describe(`GET ${testKit.urls.tasksAPI}`, () => {
    beforeEach(async () => {
        await testKit.models.task.deleteMany({}).exec();
    });

    describe('Session token not provided', () => {
        test('return 401 status code and invalid token error message', async () => {
            const response = await testKit.agent.get(`${testKit.urls.tasksAPI}?limit=1&page=1`);
            expect(response.body).toStrictEqual({ error: authErrors.INVALID_TOKEN });
            expect(response.status).toBe(401);
        });
    });

    describe('Page is not a number', () => {
        test('return 400 status code and invalid page error message', async () => {
            const invalidPage = 'A12####';
            const { sessionToken } = await createUser(getRandomRole());
            const response = await testKit.agent
                .get(`${testKit.urls.tasksAPI}?limit=1&page=${invalidPage}`)
                .set('Authorization', `Bearer ${sessionToken}`);
            expect(response.body).toStrictEqual({ error: paginationErrors.INVALID_PAGE });
            expect(response.status).toBe(400);
        });
    });

    describe('Limit is not a number', () => {
        test('return 400 status code and invalid limit error message', async () => {
            const invalidLimit = 'A12####';
            const { sessionToken } = await createUser(getRandomRole());
            const response = await testKit.agent
                .get(`${testKit.urls.tasksAPI}?limit=${invalidLimit}&page=1`)
                .set('Authorization', `Bearer ${sessionToken}`);
            expect(response.body).toStrictEqual({ error: paginationErrors.INVALID_LIMIT });
            expect(response.status).toBe(400);
        });
    });

    describe('No filters provided', () => {
        test('returns empty pagination when there are no tasks', async () => {
            const { sessionToken } = await createUser(UserRole.READONLY);
            const response = await testKit.agent
                .get(`${testKit.urls.tasksAPI}?limit=10&page=1`)
                .set('Authorization', `Bearer ${sessionToken}`);
            expect(response.body).toStrictEqual({
                totalDocuments: 0,
                totalPages: 0,
                currentPage: 1,
                data: [],
            });
            expect(response.status).toBe(200);
        });

        test('paginates all tasks sorted by createdAt then _id', async () => {
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

            const { sessionToken } = await createUser(UserRole.READONLY);
            const half = Math.ceil(expectedTasks.length / 2);
            // first half
            const res1 = await testKit.agent
                .get(`${testKit.urls.tasksAPI}?limit=${half}&page=1`)
                .set('Authorization', `Bearer ${sessionToken}`)
                .expect(status2xx);
            expect(res1.body.data).toStrictEqual(expectedTasks.slice(0, half));
            // second half
            const res2 = await testKit.agent
                .get(`${testKit.urls.tasksAPI}?limit=${half}&page=2`)
                .set('Authorization', `Bearer ${sessionToken}`)
                .expect(status2xx);
            expect(res2.body.data).toStrictEqual(expectedTasks.slice(half));
        });

        test('supports pages beyond available data', async () => {
            const user = await createUser(UserRole.EDITOR);
            await createTasksForUser(user.id, 5);
            const { sessionToken } = await createUser(UserRole.READONLY);
            const totalTasks = await testKit.models.task.countDocuments().exec();
            const response = await testKit.agent
                .get(`${testKit.urls.tasksAPI}?limit=2&page=10`)
                .set('Authorization', `Bearer ${sessionToken}`)
                .expect(status2xx);
            expect(response.body.data).toStrictEqual([]);
            expect(response.body.totalDocuments).toBe(totalTasks);
            expect(response.body.totalPages).toBe(Math.ceil(totalTasks / 2));
        });

        test('caches tasks returned in the page', async () => {
            const { id } = await createUser(UserRole.EDITOR);
            await createTasksForUser(id, 7);
            const tasksReturned = 3;
            const { sessionToken } = await createUser(UserRole.READONLY);
            const response = await testKit.agent
                .get(`${testKit.urls.tasksAPI}?limit=${tasksReturned}&page=2`)
                .set('Authorization', `Bearer ${sessionToken}`)
                .expect(status2xx);
            const tasksInResponseId = response.body.data.map((t: TaskDocument) => t.id);
            await Promise.all(
                tasksInResponseId.map(async (taskId: string) => {
                    const inCache = await testKit.tasksCacheService.get(taskId);
                    expect(inCache).not.toBeNull();
                }),
            );
        });

        test('returns total documents and pages for all tasks', async () => {
            const totalTasks = await testKit.models.task.countDocuments().exec();
            const { sessionToken } = await createUser(UserRole.READONLY);
            const response = await testKit.agent
                .get(`${testKit.urls.tasksAPI}?limit=2&page=1`)
                .set('Authorization', `Bearer ${sessionToken}`);
            expect(response.body.totalDocuments).toBe(totalTasks);
            expect(response.body.totalPages).toBe(Math.ceil(totalTasks / 2));
        });

        test('returns cached task when available', async () => {
            const { id } = await createUser(UserRole.EDITOR);
            const tasks = await createTasksForUser(id, 5);
            const randomTask = tasks[2];
            randomTask.name = 'This name indicates that the task came from cache';
            await testKit.tasksCacheService.cache(randomTask);
            const { sessionToken } = await createUser(UserRole.READONLY);
            const response = await testKit.agent
                .get(`${testKit.urls.tasksAPI}?limit=100&page=1`)
                .set('Authorization', `Bearer ${sessionToken}`)
                .expect(status2xx);
            const taskFromResponse = response.body.data.find(
                (t: TaskDocument) => t.id === randomTask._id.toString(),
            );
            expect(taskFromResponse.name).toBe('This name indicates that the task came from cache');
        });
    });

    describe('Filters - user', () => {
        test('rejects non existing user', async () => {
            const { sessionToken } = await createUser(getRandomRole());
            const response = await testKit.agent
                .get(
                    `${testKit.urls.tasksAPI}?user=${new Types.ObjectId().toString()}&limit=1&page=1`,
                )
                .set('Authorization', `Bearer ${sessionToken}`);
            expect(response.body).toStrictEqual({ error: usersApiErrors.NOT_FOUND });
            expect(response.status).toBe(404);
        });

        test('rejects invalid mongo id', async () => {
            const { sessionToken } = await createUser(getRandomRole());
            const response = await testKit.agent
                .get(`${testKit.urls.tasksAPI}?user=123&limit=1&page=1`)
                .set('Authorization', `Bearer ${sessionToken}`);
            expect(response.body).toStrictEqual({ error: usersApiErrors.NOT_FOUND });
            expect(response.status).toBe(404);
        });

        test('returns empty pagination when user has no tasks', async () => {
            const { sessionToken, id } = await createUser(getRandomRole());
            const response = await testKit.agent
                .get(`${testKit.urls.tasksAPI}?user=${id}&limit=1&page=1`)
                .set('Authorization', `Bearer ${sessionToken}`);
            expect(response.body).toStrictEqual({
                totalDocuments: 0,
                totalPages: 0,
                currentPage: 1,
                data: [],
            });
        });

        test('supports pagination over a single user tasks', async () => {
            await createTasksForUser((await createUser(UserRole.EDITOR)).id, 10);
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
            // first half
            const res1 = await testKit.agent
                .get(`${testKit.urls.tasksAPI}?user=${id}&limit=${nTasks / 2}&page=1`)
                .set('Authorization', `Bearer ${sessionToken}`)
                .expect(status2xx);
            expect(res1.body.data).toStrictEqual(expectedTasks.slice(0, nTasks / 2));
            // second half
            const res2 = await testKit.agent
                .get(`${testKit.urls.tasksAPI}?user=${id}&limit=${nTasks / 2}&page=2`)
                .set('Authorization', `Bearer ${sessionToken}`)
                .expect(status2xx);
            expect(res2.body.data).toStrictEqual(expectedTasks.slice(nTasks / 2));
        });

        test('caches tasks in user-filtered pages', async () => {
            const { sessionToken, id } = await createUser(UserRole.EDITOR);
            await createTasksForUser(id, 7);
            const tasksReturned = 3;
            const response = await testKit.agent
                .get(`${testKit.urls.tasksAPI}?user=${id}&limit=${tasksReturned}&page=2`)
                .set('Authorization', `Bearer ${sessionToken}`)
                .expect(status2xx);
            const tasksInResponseId = response.body.data.map((t: TaskDocument) => t.id);
            await Promise.all(
                tasksInResponseId.map(async (taskId: string) => {
                    const inCache = await testKit.tasksCacheService.get(taskId);
                    expect(inCache).not.toBeNull();
                }),
            );
        });

        test('returns total documents only for the specified user', async () => {
            await createTasksForUser((await createUser(UserRole.EDITOR)).id, 4);
            const { sessionToken, id } = await createUser(UserRole.EDITOR);
            const nTasks = 5;
            await createTasksForUser(id, nTasks);
            const response = await testKit.agent
                .get(`${testKit.urls.tasksAPI}?user=${id}&limit=2&page=1`)
                .set('Authorization', `Bearer ${sessionToken}`);
            expect(response.body.totalDocuments).toBe(nTasks);
        });

        test('uses cached task data when available for user filter', async () => {
            const { sessionToken, id } = await createUser(UserRole.EDITOR);
            const tasks = await createTasksForUser(id, 5);
            const randomTask = tasks[2];
            randomTask.name = 'This name indicates that the task came from cache';
            await testKit.tasksCacheService.cache(randomTask);
            const response = await testKit.agent
                .get(`${testKit.urls.tasksAPI}?user=${id}&limit=5&page=1`)
                .set('Authorization', `Bearer ${sessionToken}`)
                .expect(status2xx);
            const taskFromResponse = response.body.data.find(
                (t: TaskDocument) => t.id === randomTask._id.toString(),
            );
            expect(taskFromResponse.name).toBe('This name indicates that the task came from cache');
        });

        test('computes total pages for user filter', async () => {
            const { sessionToken, id } = await createUser(UserRole.EDITOR);
            const nTasks = 7;
            await createTasksForUser(id, nTasks);
            const response = await testKit.agent
                .get(`${testKit.urls.tasksAPI}?user=${id}&limit=2&page=1`)
                .set('Authorization', `Bearer ${sessionToken}`);
            expect(response.body.totalPages).toBe(Math.ceil(nTasks / 2));
        });

        test('returns empty page when requesting beyond available data for user filter', async () => {
            const { sessionToken, id } = await createUser(UserRole.EDITOR);
            await createTasksForUser(id, 3);
            const response = await testKit.agent
                .get(`${testKit.urls.tasksAPI}?user=${id}&limit=2&page=5`)
                .set('Authorization', `Bearer ${sessionToken}`)
                .expect(status2xx);
            expect(response.body.data).toStrictEqual([]);
            expect(response.body.totalDocuments).toBe(3);
            expect(response.body.totalPages).toBe(2);
        });
    });

    describe('Filters - status', () => {
        test('rejects invalid status', async () => {
            const invalidStatus = 'invalid-status';
            const { sessionToken } = await createUser(getRandomRole());
            const response = await testKit.agent
                .get(`${testKit.urls.tasksAPI}?status=${invalidStatus}&limit=1&page=1`)
                .set('Authorization', `Bearer ${sessionToken}`);
            expect(response.body).toStrictEqual({ error: tasksApiErrors.INVALID_STATUS });
            expect(response.status).toBe(400);
        });

        test('returns empty pagination when no tasks match status', async () => {
            const { sessionToken, id } = await createUser(UserRole.EDITOR);
            await createTasksWithStatus(id, 'pending', 2);
            await createTasksWithStatus(id, 'in-progress', 2);
            const response = await testKit.agent
                .get(`${testKit.urls.tasksAPI}?user=${id}&status=completed&limit=10&page=1`)
                .set('Authorization', `Bearer ${sessionToken}`);
            expect(response.body).toStrictEqual({
                totalDocuments: 0,
                totalPages: 0,
                currentPage: 1,
                data: [],
            });
        });

        test('paginates tasks with specific status', async () => {
            const { sessionToken, id } = await createUser(UserRole.EDITOR);
            await createTasksWithStatus(id, 'archived', 4);
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
            // first half
            const res1 = await testKit.agent
                .get(`${testKit.urls.tasksAPI}?status=archived&limit=${limit}&page=1`)
                .set('Authorization', `Bearer ${sessionToken}`)
                .expect(status2xx);
            expect(res1.body.data).toStrictEqual(expectedTasks.slice(0, limit));
            // second half
            const res2 = await testKit.agent
                .get(`${testKit.urls.tasksAPI}?status=archived&limit=${limit}&page=2`)
                .set('Authorization', `Bearer ${sessionToken}`)
                .expect(status2xx);
            expect(res2.body.data).toStrictEqual(expectedTasks.slice(limit, nTasks));
        });

        test('caches tasks in status-filtered pages', async () => {
            const { sessionToken, id } = await createUser(UserRole.EDITOR);
            await createTasksWithStatus(id, 'in-progress', 7);
            const tasksReturned = 3;
            const response = await testKit.agent
                .get(`${testKit.urls.tasksAPI}?status=in-progress&limit=${tasksReturned}&page=2`)
                .set('Authorization', `Bearer ${sessionToken}`)
                .expect(status2xx);
            const tasksInResponseId = response.body.data.map((t: TaskDocument) => t.id);
            await Promise.all(
                tasksInResponseId.map(async (taskId: string) => {
                    const inCache = await testKit.tasksCacheService.get(taskId);
                    expect(inCache).not.toBeNull();
                }),
            );
        });

        test('returns total documents for the given status', async () => {
            const { sessionToken, id } = await createUser(UserRole.EDITOR);
            await createTasksWithStatus(id, 'completed', 5);
            const totalCompletedTasks = await testKit.models.task
                .countDocuments({ status: 'completed' })
                .exec();
            const response = await testKit.agent
                .get(`${testKit.urls.tasksAPI}?status=completed&limit=2&page=1`)
                .set('Authorization', `Bearer ${sessionToken}`);
            expect(response.body.totalDocuments).toBe(totalCompletedTasks);
        });

        test('uses cached task data when available for status filter', async () => {
            const { sessionToken, id } = await createUser(UserRole.EDITOR);
            const tasks = await createTasksWithStatus(id, 'pending', 5);
            const randomTask = tasks[2];
            randomTask.name = 'This name indicates that the task came from cache';
            await testKit.tasksCacheService.cache(randomTask);
            const response = await testKit.agent
                .get(`${testKit.urls.tasksAPI}?status=pending&limit=100&page=1`)
                .set('Authorization', `Bearer ${sessionToken}`)
                .expect(status2xx);
            const taskFromResponse = response.body.data.find(
                (t: TaskDocument) => t.id === randomTask._id.toString(),
            );
            expect(taskFromResponse.name).toBe('This name indicates that the task came from cache');
        });

        test('computes total pages for status filter', async () => {
            const { sessionToken, id } = await createUser(UserRole.EDITOR);
            await createTasksWithStatus(id, 'pending', 7);
            const nTasks = await testKit.models.task.countDocuments({ status: 'pending' }).exec();
            const response = await testKit.agent
                .get(`${testKit.urls.tasksAPI}?status=pending&limit=2&page=1`)
                .set('Authorization', `Bearer ${sessionToken}`);
            expect(response.body.totalPages).toBe(Math.ceil(nTasks / 2));
        });

        test('handles pages beyond available data for status filter', async () => {
            const { sessionToken, id } = await createUser(UserRole.EDITOR);
            await createTasksWithStatus(id, 'pending', 3);
            const totalPendingTasks = await testKit.models.task
                .countDocuments({ status: 'pending' })
                .exec();
            const response = await testKit.agent
                .get(`${testKit.urls.tasksAPI}?status=pending&limit=2&page=100`)
                .set('Authorization', `Bearer ${sessionToken}`)
                .expect(status2xx);
            expect(response.body.data).toStrictEqual([]);
            expect(response.body.totalDocuments).toBe(totalPendingTasks);
        });

        test.each(tasksStatus)('accepts status "%s"', async (status) => {
            const { sessionToken, id } = await createUser(UserRole.EDITOR);
            await createTasksWithStatus(id, status, 2);
            const totalTasksWithStatus = await testKit.models.task
                .countDocuments({ status })
                .exec();
            const response = await testKit.agent
                .get(`${testKit.urls.tasksAPI}?status=${status}&limit=100&page=1`)
                .set('Authorization', `Bearer ${sessionToken}`)
                .expect(status2xx);
            expect(response.body.totalDocuments).toBe(totalTasksWithStatus);
            expect(response.body.totalDocuments).toBeGreaterThanOrEqual(2);
        });
    });

    describe('Filters - priority', () => {
        test('rejects invalid priority', async () => {
            const invalidPriority = 'invalid-priority';
            const { sessionToken } = await createUser(getRandomRole());
            const response = await testKit.agent
                .get(`${testKit.urls.tasksAPI}?priority=${invalidPriority}&limit=1&page=1`)
                .set('Authorization', `Bearer ${sessionToken}`);
            expect(response.body).toStrictEqual({ error: tasksApiErrors.INVALID_PRIORITY });
            expect(response.status).toBe(400);
        });

        test('returns empty pagination when no tasks match priority', async () => {
            const { sessionToken, id } = await createUser(UserRole.EDITOR);
            await createTasksWithPriority(id, 'low', 2);
            await createTasksWithPriority(id, 'medium', 2);
            const response = await testKit.agent
                .get(`${testKit.urls.tasksAPI}?user=${id}&priority=high&limit=10&page=1`)
                .set('Authorization', `Bearer ${sessionToken}`);
            expect(response.body).toStrictEqual({
                totalDocuments: 0,
                totalPages: 0,
                currentPage: 1,
                data: [],
            });
        });

        test('paginates tasks with specific priority', async () => {
            const { sessionToken, id } = await createUser(UserRole.EDITOR);
            await createTasksWithPriority(id, 'high', 4);
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
                    id: t._id.toString(),
                    createdAt: t.createdAt.toISOString(),
                }));
            const nTasks = expectedTasks.length;
            const limit = Math.ceil(nTasks / 2);
            // first half
            const res1 = await testKit.agent
                .get(`${testKit.urls.tasksAPI}?priority=high&limit=${limit}&page=1`)
                .set('Authorization', `Bearer ${sessionToken}`)
                .expect(status2xx);
            const responseIdsPage1 = res1.body.data.map((t: TaskDocument) => t.id);
            expect(responseIdsPage1).toStrictEqual(expectedTasks.slice(0, limit).map((t) => t.id));
            expect(res1.body.data).toHaveLength(expectedTasks.slice(0, limit).length);
            // second half
            const res2 = await testKit.agent
                .get(`${testKit.urls.tasksAPI}?priority=high&limit=${limit}&page=2`)
                .set('Authorization', `Bearer ${sessionToken}`)
                .expect(status2xx);
            const responseIdsPage2 = res2.body.data.map((t: TaskDocument) => t.id);
            expect(responseIdsPage2).toStrictEqual(
                expectedTasks.slice(limit, nTasks).map((t) => t.id),
            );
            expect(res2.body.data).toHaveLength(expectedTasks.slice(limit, nTasks).length);
        });

        test('caches tasks in priority-filtered pages', async () => {
            const { sessionToken, id } = await createUser(UserRole.EDITOR);
            await createTasksWithPriority(id, 'medium', 7);
            const tasksReturned = 3;
            const response = await testKit.agent
                .get(`${testKit.urls.tasksAPI}?priority=medium&limit=${tasksReturned}&page=2`)
                .set('Authorization', `Bearer ${sessionToken}`)
                .expect(status2xx);
            const tasksInResponseId = response.body.data.map((t: TaskDocument) => t.id);
            await Promise.all(
                tasksInResponseId.map(async (taskId: string) => {
                    const inCache = await testKit.tasksCacheService.get(taskId);
                    expect(inCache).not.toBeNull();
                }),
            );
        });

        test('returns total documents for the given priority', async () => {
            const { sessionToken, id } = await createUser(UserRole.EDITOR);
            await createTasksWithPriority(id, 'low', 5);
            const totalLowPriorityTasks = await testKit.models.task
                .countDocuments({ priority: 'low' })
                .exec();
            const response = await testKit.agent
                .get(`${testKit.urls.tasksAPI}?priority=low&limit=2&page=1`)
                .set('Authorization', `Bearer ${sessionToken}`);
            expect(response.body.totalDocuments).toBe(totalLowPriorityTasks);
        });

        test('uses cached task data when available for priority filter', async () => {
            const { sessionToken, id } = await createUser(UserRole.EDITOR);
            const tasks = await createTasksWithPriority(id, 'high', 5);
            const randomTask = tasks[2];
            randomTask.name = 'This name indicates that the task came from cache';
            await testKit.tasksCacheService.cache(randomTask);
            const response = await testKit.agent
                .get(`${testKit.urls.tasksAPI}?priority=high&limit=100&page=1`)
                .set('Authorization', `Bearer ${sessionToken}`)
                .expect(status2xx);
            const taskFromResponse = response.body.data.find(
                (t: TaskDocument) => t.id === randomTask._id.toString(),
            );
            expect(taskFromResponse.name).toBe('This name indicates that the task came from cache');
        });

        test('computes total pages for priority filter', async () => {
            const { sessionToken, id } = await createUser(UserRole.EDITOR);
            await createTasksWithPriority(id, 'low', 7);
            const nTasks = await testKit.models.task.countDocuments({ priority: 'low' }).exec();
            const response = await testKit.agent
                .get(`${testKit.urls.tasksAPI}?priority=low&limit=2&page=1`)
                .set('Authorization', `Bearer ${sessionToken}`);
            expect(response.body.totalPages).toBe(Math.ceil(nTasks / 2));
        });

        test('handles pages beyond available data for priority filter', async () => {
            const { sessionToken, id } = await createUser(UserRole.EDITOR);
            await createTasksWithPriority(id, 'medium', 3);
            const totalMediumPriorityTasks = await testKit.models.task
                .countDocuments({ priority: 'medium' })
                .exec();
            const response = await testKit.agent
                .get(`${testKit.urls.tasksAPI}?priority=medium&limit=2&page=100`)
                .set('Authorization', `Bearer ${sessionToken}`)
                .expect(status2xx);
            expect(response.body.data).toStrictEqual([]);
            expect(response.body.totalDocuments).toBe(totalMediumPriorityTasks);
        });

        test.each(tasksPriority)('accepts priority "%s"', async (priority) => {
            const { sessionToken, id } = await createUser(UserRole.EDITOR);
            await createTasksWithPriority(id, priority, 2);
            const totalTasksWithPriority = await testKit.models.task
                .countDocuments({ priority })
                .exec();
            const response = await testKit.agent
                .get(`${testKit.urls.tasksAPI}?priority=${priority}&limit=100&page=1`)
                .set('Authorization', `Bearer ${sessionToken}`)
                .expect(status2xx);
            expect(response.body.totalDocuments).toBe(totalTasksWithPriority);
            expect(response.body.totalDocuments).toBeGreaterThanOrEqual(2);
        });
    });

    describe('Combined filters & pollution', () => {
        test('returns tasks filtered by user, status and priority together', async () => {
            const { id: targetUserId } = await createUser(UserRole.EDITOR);
            const { id: otherUserId } = await createUser(UserRole.EDITOR);
            const baseDate = new Date('2024-01-01T00:00:00.000Z');
            const matchingTasks = await testKit.models.task.create([
                {
                    ...testKit.taskData.task,
                    user: targetUserId,
                    status: 'pending',
                    priority: 'high',
                    createdAt: baseDate,
                },
                {
                    ...testKit.taskData.task,
                    user: targetUserId,
                    status: 'pending',
                    priority: 'high',
                    createdAt: new Date(baseDate.getTime() + 1000),
                },
            ]);
            await testKit.models.task.create([
                {
                    ...testKit.taskData.task,
                    user: targetUserId,
                    status: 'completed',
                    priority: 'high',
                    createdAt: new Date(baseDate.getTime() + 2000),
                },
                {
                    ...testKit.taskData.task,
                    user: otherUserId,
                    status: 'pending',
                    priority: 'high',
                    createdAt: new Date(baseDate.getTime() + 3000),
                },
                {
                    ...testKit.taskData.task,
                    user: targetUserId,
                    status: 'pending',
                    priority: 'low',
                    createdAt: new Date(baseDate.getTime() + 4000),
                },
            ]);
            const { sessionToken } = await createUser(UserRole.READONLY);
            const response = await testKit.agent
                .get(
                    `${testKit.urls.tasksAPI}?user=${targetUserId}&status=pending&priority=high&limit=10&page=1`,
                )
                .set('Authorization', `Bearer ${sessionToken}`)
                .expect(status2xx);
            const expectedTasks = [...matchingTasks]
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
            expect(response.body.data).toStrictEqual(expectedTasks);
            expect(response.body.totalDocuments).toBe(matchingTasks.length);
        });
    });
});
