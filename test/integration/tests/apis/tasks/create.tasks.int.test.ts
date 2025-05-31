import request from 'supertest';
import { createUser, status2xx, testKit } from '@integration/utils';
import { createTask } from '@integration/utils/createTask.util';

describe('POST /api/tasks', () => {
    describe('Input Sanitization', () => {
        test.concurrent('return status 404 BAD REQUEST when task priority is not valid', async () => {
            const expectedStatus = 400;
            const expectedErrorMssg = 'priority must be one of the following values: low, medium, high';

            const { sessionToken } = await createUser('editor');

            // Create task with invalid priority            
            const response = await request(testKit.server)
                .post(testKit.endpoints.createTask)
                .set('Authorization', `Bearer ${sessionToken}`)
                .send({
                    ...testKit.tasksDataGenerator.fullTask(),
                    priority: 'invalid_priority' as any
                })

            expect(response.body).toStrictEqual({ error: expectedErrorMssg });
            expect(response.statusCode).toBe(expectedStatus);
        });
    });

    describe('Database operations', () => {
        test.concurrent('create task with correct data in db', async () => {
            const { sessionToken, userId } = await createUser('editor');
            const task = testKit.tasksDataGenerator.fullTask();

            const { id: taskId } = (await request(testKit.server)
                .post(testKit.endpoints.createTask)
                .send(task)
                .set('Authorization', `Bearer ${sessionToken}`)
                .expect(status2xx)).body;

            // Verify DB persistence
            const taskInDb = await testKit.tasksModel.findById(taskId);
            expect(taskInDb).toBeDefined();

            // Verify transformations
            expect(taskInDb!.name).toBe(task.name.toLowerCase());

            // User association
            expect(taskInDb!.user.toString()).toBe(userId);

            // Verify unmodified values
            expect(taskInDb!.description).toBe(task.description);
            expect(taskInDb!.status).toBe(task.status);
            expect(taskInDb!.priority).toBe(task.priority);

            // Verify default values
            expect(taskInDb!.createdAt).toBeDefined();
            expect(taskInDb!.updatedAt).toBeDefined();
        });

        describe('Duplicated Property Error Handling Wiring', () => {
            test.concurrent('return status 409 CONFLICT when task name already exists', async () => {
                // Create a task associated to user1
                const { sessionToken: user1SessionToken } = await createUser('editor');
                const { taskName } = await createTask(user1SessionToken);

                const expectedStatus = 409;
                const expectedErrorMssg = `Task with name "${taskName}" already exists`;

                // user2 tries to create a new task with the same name
                const { sessionToken: user2SessionToken } = await createUser('admin');
                const response = await request(testKit.server)
                    .post(testKit.endpoints.createTask)
                    .send({
                        ...testKit.tasksDataGenerator.fullTask(),
                        name: taskName,
                    })
                    .set('Authorization', `Bearer ${user2SessionToken}`);

                expect(response.body).toStrictEqual({ error: expectedErrorMssg });
                expect(response.statusCode).toBe(expectedStatus);
            });
        });
    });

    describe('Response', () => {
        test.concurrent('return status 201 CREATED and correct data', async () => {
            const expectedStatus = 201;
            const { sessionToken, userId } = await createUser('editor');
            const task = testKit.tasksDataGenerator.fullTask();

            const response = await request(testKit.server)
                .post(testKit.endpoints.createTask)
                .send(task)
                .set('Authorization', `Bearer ${sessionToken}`);

            const taskInDb = await testKit.tasksModel.findOne({ name: task.name.toLowerCase() });

            expect(response.statusCode).toBe(expectedStatus);
            expect(response.body).toStrictEqual({
                name: taskInDb!.name,
                description: taskInDb!.description,
                status: taskInDb!.status,
                priority: taskInDb!.priority,
                user: taskInDb!.user.toString(),
                createdAt: taskInDb!.createdAt.toISOString(),
                updatedAt: taskInDb!.updatedAt.toISOString(),
                id: taskInDb!.id,
            });
        });
    });
});