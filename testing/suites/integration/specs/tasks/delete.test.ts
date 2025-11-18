import { testKit } from '@integration/kit/test.kit';
import { createUser } from '@integration/utils/create-user.util';
import { status2xx } from '@integration/utils/status-2xx.util';
import { getRandomRole } from '@test/tools/utilities/get-random-role.util';
import { Types } from 'mongoose';
import { UserRole } from 'src/enums/user-role.enum';
import { authErrors } from 'src/messages/auth.error.messages';
import { tasksApiErrors } from 'src/messages/tasks-api.error.messages';

describe(`DELETE ${testKit.urls.tasksAPI}/:id`, () => {
    describe('Session token not provided', () => {
        test('return 401 status code and invalid token error message', async () => {
            const response = await testKit.agent.delete(
                `${testKit.urls.tasksAPI}/${new Types.ObjectId().toString()}`,
            );
            expect(response.body).toStrictEqual({ error: authErrors.INVALID_TOKEN });
            expect(response.status).toBe(401);
        });
    });

    describe('Task deleted successfully', () => {
        test('task should be removed from database', async () => {
            const { sessionToken, id } = await createUser(UserRole.EDITOR);
            const task = testKit.taskData.task;
            const { id: taskId } = await testKit.models.task.create({ ...task, user: id });
            await testKit.agent
                .delete(`${testKit.urls.tasksAPI}/${taskId}`)
                .set('Authorization', `Bearer ${sessionToken}`)
                .expect(status2xx);
            const taskInDbAfterDelete = await testKit.models.task
                .findOne({ name: task.name })
                .exec();
            expect(taskInDbAfterDelete).toBeNull();
        });

        test('return 204 status code and empty body', async () => {
            const { sessionToken, id } = await createUser(UserRole.EDITOR);
            const task = testKit.taskData.task;
            const { id: taskId } = await testKit.models.task.create({ ...task, user: id });
            const response = await testKit.agent
                .delete(`${testKit.urls.tasksAPI}/${taskId}`)
                .set('Authorization', `Bearer ${sessionToken}`);
            expect(response.status).toBe(204);
            expect(response.body).toStrictEqual({});
        });
    });

    describe('Task id not found', () => {
        test('return 404 status code and not found error message', async () => {
            const { sessionToken } = await createUser(UserRole.EDITOR);
            const validId = new Types.ObjectId().toString();
            const response = await testKit.agent
                .delete(`${testKit.urls.tasksAPI}/${validId}`)
                .set('Authorization', `Bearer ${sessionToken}`);
            expect(response.body).toStrictEqual({ error: tasksApiErrors.NOT_FOUND });
            expect(response.status).toBe(404);
        });
    });

    describe('Invalid mongo id', () => {
        test('return 404 status code and not found error message', async () => {
            const { sessionToken } = await createUser(UserRole.EDITOR);
            const invalidId = '12345invalididddddddddddddddddddddddddd';
            const response = await testKit.agent
                .delete(`${testKit.urls.tasksAPI}/${invalidId}`)
                .set('Authorization', `Bearer ${sessionToken}`);
            expect(response.body).toStrictEqual({ error: tasksApiErrors.NOT_FOUND });
            expect(response.status).toBe(404);
        });
    });

    describe('User is READONLY', () => {
        test('can not delete their own tasks (403)', async () => {
            const { sessionToken, id } = await createUser(UserRole.READONLY);
            const task = testKit.taskData.task;
            const { id: taskId } = await testKit.models.task.create({ ...task, user: id });
            const response = await testKit.agent
                .delete(`${testKit.urls.tasksAPI}/${taskId}`)
                .set('Authorization', `Bearer ${sessionToken}`);
            expect(response.body).toStrictEqual({ error: authErrors.FORBIDDEN });
            expect(response.status).toBe(403);
        });

        test('can not delete other users tasks (403)', async () => {
            const { sessionToken: userSess1 } = await createUser(UserRole.READONLY);
            // create a task for another user with a random role
            const { id: user2Id } = await createUser(getRandomRole());
            const { id: taskId } = await testKit.models.task.create({
                ...testKit.taskData.task,
                user: user2Id,
            });
            const response = await testKit.agent
                .delete(`${testKit.urls.tasksAPI}/${taskId}`)
                .set('Authorization', `Bearer ${userSess1}`);
            expect(response.body).toStrictEqual({ error: authErrors.FORBIDDEN });
            expect(response.status).toBe(403);
        });
    });

    describe('User is EDITOR', () => {
        test('can delete their own tasks', async () => {
            const { sessionToken, id } = await createUser(UserRole.EDITOR);
            const task = testKit.taskData.task;
            const { id: taskId } = await testKit.models.task.create({ ...task, user: id });
            await testKit.agent
                .delete(`${testKit.urls.tasksAPI}/${taskId}`)
                .set('Authorization', `Bearer ${sessionToken}`)
                .expect(status2xx);
        });

        test('can not delete other users tasks (403)', async () => {
            const { sessionToken: userSess1 } = await createUser(UserRole.EDITOR);
            // create a task for another user with a random role
            const { id: user2Id } = await createUser(getRandomRole());
            const { id: taskId } = await testKit.models.task.create({
                ...testKit.taskData.task,
                user: user2Id,
            });
            const response = await testKit.agent
                .delete(`${testKit.urls.tasksAPI}/${taskId}`)
                .set('Authorization', `Bearer ${userSess1}`);
            expect(response.body).toStrictEqual({ error: authErrors.FORBIDDEN });
            expect(response.status).toBe(403);
        });
    });

    describe('User is ADMIN', () => {
        test('can not delete another ADMIN user task (403)', async () => {
            const { sessionToken: adminSess1 } = await createUser(UserRole.ADMIN);
            // create a task for another admin user
            const { id: admin2Id } = await createUser(UserRole.ADMIN);
            const { id: taskId } = await testKit.models.task.create({
                ...testKit.taskData.task,
                user: admin2Id,
            });
            const response = await testKit.agent
                .delete(`${testKit.urls.tasksAPI}/${taskId}`)
                .set('Authorization', `Bearer ${adminSess1}`);
            expect(response.body).toStrictEqual({ error: authErrors.FORBIDDEN });
            expect(response.status).toBe(403);
        });
    });
});
