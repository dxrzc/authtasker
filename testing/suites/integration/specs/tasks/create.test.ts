import { createUser } from '@integration/utils/create-user.util';
import { authErrors } from 'src/messages/auth.error.messages';
import { testKit } from '@integration/kit/test.kit';
import { UserRole } from 'src/enums/user-role.enum';
import { status2xx } from '@integration/utils/status-2xx.util';
import { tasksApiErrors } from 'src/messages/tasks-api.error.messages';

describe(`POST ${testKit.urls.createTask}`, () => {
    describe('Session token not provided', () => {
        test('return 401 status code and invalid token error message', async () => {
            const response = await testKit.agent
                .post(testKit.urls.createTask)
                .send(testKit.taskData.task);
            expect(response.body).toStrictEqual({ error: authErrors.INVALID_TOKEN });
            expect(response.status).toBe(401);
        });
    });

    describe('Task is created successfully', () => {
        test('return 201 status code and created task in database', async () => {
            const { sessionToken } = await createUser(UserRole.EDITOR);
            const task = testKit.taskData.task;
            const response = await testKit.agent
                .post(testKit.urls.createTask)
                .set('Authorization', `Bearer ${sessionToken}`)
                .send(task)
                .expect(201);
            const taskInDb = await testKit.models.task.findOne({ name: task.name });
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

        test('name is be transformed to lowercase and spaces trimmed', async () => {
            const { sessionToken } = await createUser(UserRole.EDITOR);
            const task = {
                ...testKit.taskData.task,
                name: '   TeSt TaSk NaMe   ',
            };
            await testKit.agent
                .post(testKit.urls.createTask)
                .set('Authorization', `Bearer ${sessionToken}`)
                .send(task)
                .expect(201);
            const taskInDb = await testKit.models.task.findOne({ name: 'test task name' });
            expect(taskInDb).not.toBeNull();
        });

        test('user property is the creator id', async () => {
            const { sessionToken, id } = await createUser(UserRole.EDITOR);
            const task = testKit.taskData.task;
            await testKit.agent
                .post(testKit.urls.createTask)
                .set('Authorization', `Bearer ${sessionToken}`)
                .send(task)
                .expect(201);
            const taskInDb = await testKit.models.task.findOne({ name: task.name });
            expect(taskInDb?.user.toString()).toBe(id);
        });
    });

    describe('User role is READONLY', () => {
        test('return 403 forbidden and forbidden error message', async () => {
            const { sessionToken } = await createUser(UserRole.READONLY);
            const response = await testKit.agent
                .post(testKit.urls.createTask)
                .set('Authorization', `Bearer ${sessionToken}`)
                .send(testKit.taskData.task);
            expect(response.body).toStrictEqual({ error: authErrors.FORBIDDEN });
            expect(response.status).toBe(403);
        });
    });

    describe('Task name already exists', () => {
        test('return 409 conflict and task already exists error message', async () => {
            const { sessionToken: userSess1 } = await createUser(UserRole.EDITOR);
            const { sessionToken: userSess2 } = await createUser(UserRole.EDITOR);
            const task = testKit.taskData.task;
            await testKit.agent
                .post(testKit.urls.createTask)
                .set('Authorization', `Bearer ${userSess1}`)
                .send(task)
                .expect(status2xx);
            const response = await testKit.agent
                .post(testKit.urls.createTask)
                .set('Authorization', `Bearer ${userSess2}`)
                .send(task);
            expect(response.body).toStrictEqual({ error: tasksApiErrors.ALREADY_EXISTS });
            expect(response.status).toBe(409);
        });
    });

    describe('Invalid status', () => {
        test('return 400 status code and invalid status error message', async () => {
            const { sessionToken } = await createUser(UserRole.EDITOR);
            const task = {
                ...testKit.taskData.task,
                status: 'invalid-status-value',
            };
            const response = await testKit.agent
                .post(testKit.urls.createTask)
                .set('Authorization', `Bearer ${sessionToken}`)
                .send(task);
            expect(response.body).toStrictEqual({ error: tasksApiErrors.INVALID_STATUS });
            expect(response.status).toBe(400);
        });
    });

    describe('Name too long', () => {
        test('return 400 status code and invalid name length error message', async () => {
            const { sessionToken } = await createUser(UserRole.EDITOR);
            const task = {
                ...testKit.taskData.task,
                name: 'a'.repeat(201),
            };
            const response = await testKit.agent
                .post(testKit.urls.createTask)
                .set('Authorization', `Bearer ${sessionToken}`)
                .send(task);
            expect(response.body).toStrictEqual({ error: tasksApiErrors.INVALID_NAME_LENGTH });
            expect(response.status).toBe(400);
        });
    });
});
