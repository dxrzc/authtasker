import { createUser, status2xx, testKit } from "@integration/utils";
import { createTask } from "@integration/utils/createTask.util";
import request from 'supertest';

describe('PATCH /api/tasks/:id', () => {
    describe('Database operations', () => {
        test.concurrent('update properties in database', async () => {
            const { sessionToken } = await createUser('editor');
            const { taskId } = await createTask(sessionToken);

            // New task values
            const update = {
                name: testKit.tasksDataGenerator.name(),
                description: testKit.tasksDataGenerator.description(),
                status: testKit.tasksDataGenerator.status(),
                priority: testKit.tasksDataGenerator.priority(),
            };

            await request(testKit.server)
                .patch(`${testKit.endpoints.tasksAPI}/${taskId}`)
                .set('Authorization', `Bearer ${sessionToken}`)
                .send(update)
                .expect(status2xx);

            // Verify db persistence
            const taskInDb = await testKit.tasksModel.findById(taskId);
            expect(taskInDb).toBeDefined();

            // Verify transformations
            expect(taskInDb!.name).toBe(update.name.toLowerCase());

            // Verify unmodified values
            expect(taskInDb!.description).toBe(update.description);
            expect(taskInDb!.status).toBe(update.status);
            expect(taskInDb!.priority).toBe(update.priority);
        });
    });

    describe('Response - Success', () => {
        test.concurrent('return status 200 and correct task data', async () => {
            const expectedStatus = 200;

            const { sessionToken } = await createUser('editor');
            const { taskId } = await createTask(sessionToken);

            const response = await request(testKit.server)
                .patch(`${testKit.endpoints.tasksAPI}/${taskId}`)
                .set('Authorization', `Bearer ${sessionToken}`)
                .send({
                    name: testKit.tasksDataGenerator.name(),
                    description: testKit.tasksDataGenerator.description(),
                    status: testKit.tasksDataGenerator.status(),
                    priority: testKit.tasksDataGenerator.priority(),
                });

            const taskInDb = await testKit.tasksModel.findById(taskId);
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
            expect(response.statusCode).toBe(expectedStatus);
        });
    });

    describe('Response - Failure', () => {
        test.concurrent('return 400 BAD REQUEST when no field to update is provided', async () => {
            const expectedStatus = 400;
            const expectedErrorMssg = 'At least one field is required to update the task';

            const { sessionToken } = await createUser('editor');
            const { taskId } = await createTask(sessionToken);

            const response = await request(testKit.server)
                .patch(`${testKit.endpoints.tasksAPI}/${taskId}`)
                .set('Authorization', `Bearer ${sessionToken}`)
                .send();

            expect(response.statusCode).toBe(expectedStatus);
            expect(response.body).toStrictEqual({ error: expectedErrorMssg });
        });

        test.concurrent('return 409 CONFLICT when task name already exists', async () => {
            // Create the original task
            const { sessionToken: user1SessionToken } = await createUser('editor');
            const { taskName: alreadyExistingTaskName } = await createTask(user1SessionToken);

            const expectedStatus = 409;
            const expectedErrorMssg = `Task with name "${alreadyExistingTaskName}" already exists`;

            // Create the task to update
            const { sessionToken: user2SessionToken } = await createUser('editor');
            const { taskId: taskToUpdateId } = await createTask(user2SessionToken);

            // Update
            const response = await request(testKit.server)
                .patch(`${testKit.endpoints.tasksAPI}/${taskToUpdateId}`)
                .set('Authorization', `Bearer ${user2SessionToken}`)
                .send({ name: alreadyExistingTaskName })

            expect(response.body).toStrictEqual({ error: expectedErrorMssg })
            expect(response.statusCode).toBe(expectedStatus);            
        });
    });
});