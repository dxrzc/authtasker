import { createUser } from '@integration/utils/create-user.util';
import { tasksApiErrors } from 'src/messages/tasks-api.error.messages';
import { TasksStatus } from 'src/types/tasks/task-status.type';
import { authErrors } from 'src/messages/auth.error.messages';
import { UserRole } from 'src/enums/user-role.enum';
import { testKit } from '@integration/kit/test.kit';
import { Types } from 'mongoose';

describe(`PATCH ${testKit.urls.tasksAPI}/:id`, () => {
    describe('Session token not provided', () => {
        test('return 401 status code and invalid token error message', async () => {
            const response = await testKit.agent
                .patch(`${testKit.urls.tasksAPI}/${new Types.ObjectId().toString()}`)
                .send(testKit.taskData.task);
            expect(response.body).toStrictEqual({ error: authErrors.INVALID_TOKEN });
            expect(response.status).toBe(401);
        });
    });

    describe('Task not found', () => {
        test('return 404 status code and task not found error message', async () => {
            const { sessionToken } = await createUser(UserRole.EDITOR);
            const validId = new Types.ObjectId().toString();
            const response = await testKit.agent
                .patch(`${testKit.urls.tasksAPI}/${validId}`)
                .set('Authorization', `Bearer ${sessionToken}`)
                .send(testKit.taskData.task);
            expect(response.body).toStrictEqual({ error: tasksApiErrors.NOT_FOUND });
            expect(response.status).toBe(404);
        });
    });

    describe('Invalid mongo id', () => {
        test('return 404 status code and task not found error message', async () => {
            const { sessionToken } = await createUser(UserRole.EDITOR);
            const invalidId = '12345invalididddddddddddddddddddddddddd';
            const response = await testKit.agent
                .patch(`${testKit.urls.tasksAPI}/${invalidId}`)
                .set('Authorization', `Bearer ${sessionToken}`)
                .send(testKit.taskData.task);
            expect(response.body).toStrictEqual({ error: tasksApiErrors.NOT_FOUND });
            expect(response.status).toBe(404);
        });
    });

    describe('Task successfully updated', () => {
        test('changes are reflected in database', async () => {
            const { sessionToken, id: userID } = await createUser(UserRole.EDITOR);
            const task = testKit.taskData.task;
            const newTaskDescription = 'Archived Task';
            const newStatus: TasksStatus = 'archived';
            const { id: taskID } = await testKit.models.task.create({ ...task, user: userID });
            await testKit.agent
                .patch(`${testKit.urls.tasksAPI}/${taskID}`)
                .set('Authorization', `Bearer ${sessionToken}`)
                .send({ description: newTaskDescription, status: newStatus });
            // task in db should reflect changes
            const taskInDb = await testKit.models.task.findOne({ name: task.name }).exec();
            expect(taskInDb?.description).toBe(newTaskDescription);
            expect(taskInDb?.status).toBe(newStatus);
        });

        test('return status 200 and data in db', async () => {
            const { sessionToken, id: userID } = await createUser(UserRole.EDITOR);
            const { id: taskID } = await testKit.models.task.create({
                ...testKit.taskData.task,
                user: userID,
            });
            const newTaskData = testKit.taskData.task;
            const response = await testKit.agent
                .patch(`${testKit.urls.tasksAPI}/${taskID}`)
                .set('Authorization', `Bearer ${sessionToken}`)
                .send(newTaskData)
                .expect(200);
            const taskInDb = await testKit.models.task.findOne({ name: newTaskData.name }).exec();
            expect(taskInDb).not.toBeNull();
            expect(response.body).toStrictEqual({
                updatedAt: taskInDb?.updatedAt.toISOString(),
                createdAt: taskInDb?.createdAt.toISOString(),
                description: taskInDb?.description,
                user: taskInDb?.user.toString(),
                priority: taskInDb?.priority,
                status: taskInDb?.status,
                name: taskInDb?.name,
                id: taskInDb?.id,
            });
        });
    });

    describe('Invalid priority', () => {
        test('return 400 status code and invalid priority error message', async () => {
            const { sessionToken, id: userID } = await createUser(UserRole.EDITOR);
            const task = testKit.taskData.task;
            const { id: taskID } = await testKit.models.task.create({ ...task, user: userID });
            const response = await testKit.agent
                .patch(`${testKit.urls.tasksAPI}/${taskID}`)
                .set('Authorization', `Bearer ${sessionToken}`)
                .send({ priority: 'invalid-priority' });
            expect(response.body).toStrictEqual({ error: tasksApiErrors.INVALID_PRIORITY });
            expect(response.status).toBe(400);
        });
    });

    describe('Task with name already exists', () => {
        test('return 409 status code and task already exists message', async () => {
            const { sessionToken, id: userID } = await createUser(UserRole.EDITOR);
            const task = testKit.taskData.task;
            const anotherTaskName = 'another task name';
            // create two tasks in db
            const { id: taskID } = await testKit.models.task.create({ ...task, user: userID });
            await testKit.models.task.create({
                ...task,
                name: anotherTaskName,
                user: userID,
            });
            // try to update first task with name of second task
            const response = await testKit.agent
                .patch(`${testKit.urls.tasksAPI}/${taskID}`)
                .set('Authorization', `Bearer ${sessionToken}`)
                .send({ name: anotherTaskName });
            expect(response.body).toStrictEqual({ error: tasksApiErrors.ALREADY_EXISTS });
            expect(response.status).toBe(409);
        });
    });

    describe.each([UserRole.ADMIN, UserRole.EDITOR])('%s can update their own tasks', (role) => {
        test('successfully updates task', async () => {
            const { sessionToken, id } = await createUser(role);
            const task = testKit.taskData.task;
            const { id: taskId } = await testKit.models.task.create({ ...task, user: id });
            await testKit.agent
                .patch(`${testKit.urls.tasksAPI}/${taskId}`)
                .set('Authorization', `Bearer ${sessionToken}`)
                .send({ description: 'Updated description' })
                .expect(200);
        });
    });

    describe('READONLY attempts to update their own task', () => {
        test('return 403 status code and forbidden error message', async () => {
            const { sessionToken, id } = await createUser(UserRole.READONLY);
            const task = testKit.taskData.task;
            const { id: taskId } = await testKit.models.task.create({ ...task, user: id });
            const response = await testKit.agent
                .patch(`${testKit.urls.tasksAPI}/${taskId}`)
                .set('Authorization', `Bearer ${sessionToken}`)
                .send({ description: 'Updated description' });
            expect(response.body).toStrictEqual({ error: authErrors.FORBIDDEN });
            expect(response.status).toBe(403);
        });
    });

    describe.each(Object.values(UserRole))('EDITOR attempts to update a %s task', (targetRole) => {
        test('return 403 status code and forbidden error message', async () => {
            const { sessionToken } = await createUser(UserRole.EDITOR);
            const { id: targetUserId } = await createUser(targetRole);
            const { id: taskId } = await testKit.models.task.create({
                ...testKit.taskData.task,
                user: targetUserId,
            });
            const response = await testKit.agent
                .patch(`${testKit.urls.tasksAPI}/${taskId}`)
                .set('Authorization', `Bearer ${sessionToken}`)
                .send({ description: 'Updated description' });
            expect(response.body).toStrictEqual({ error: authErrors.FORBIDDEN });
            expect(response.status).toBe(403);
        });
    });

    describe.each(Object.values(UserRole))(
        'READONLY attempts to update a %s task',
        (targetRole) => {
            test('return 403 status code and forbidden error message', async () => {
                const { sessionToken } = await createUser(UserRole.READONLY);
                const { id: targetUserId } = await createUser(targetRole);
                const { id: taskId } = await testKit.models.task.create({
                    ...testKit.taskData.task,
                    user: targetUserId,
                });
                const response = await testKit.agent
                    .patch(`${testKit.urls.tasksAPI}/${taskId}`)
                    .set('Authorization', `Bearer ${sessionToken}`)
                    .send({ description: 'Updated description' });
                expect(response.body).toStrictEqual({ error: authErrors.FORBIDDEN });
                expect(response.status).toBe(403);
            });
        },
    );

    describe.each([UserRole.EDITOR, UserRole.READONLY])(
        'ADMIN attempts to update a %s task',
        (targetRole) => {
            test('successfully updates task', async () => {
                const { sessionToken } = await createUser(UserRole.ADMIN);
                const { id: targetUserId } = await createUser(targetRole);
                const { id: taskId } = await testKit.models.task.create({
                    ...testKit.taskData.task,
                    user: targetUserId,
                });
                await testKit.agent
                    .patch(`${testKit.urls.tasksAPI}/${taskId}`)
                    .set('Authorization', `Bearer ${sessionToken}`)
                    .send({ description: 'Updated description' })
                    .expect(200);
            });
        },
    );

    describe('ADMIN attempts to update another ADMIN task', () => {
        test('return 403 status code and forbidden error message', async () => {
            const { sessionToken } = await createUser(UserRole.ADMIN);
            const { id: targetUserId } = await createUser(UserRole.ADMIN);
            const { id: taskId } = await testKit.models.task.create({
                ...testKit.taskData.task,
                user: targetUserId,
            });
            const response = await testKit.agent
                .patch(`${testKit.urls.tasksAPI}/${taskId}`)
                .set('Authorization', `Bearer ${sessionToken}`)
                .send({ description: 'Updated description' });
            expect(response.body).toStrictEqual({ error: authErrors.FORBIDDEN });
            expect(response.status).toBe(403);
        });
    });
});
