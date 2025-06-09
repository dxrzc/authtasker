import request from 'supertest';
import { createUser, status2xx, testKit } from "@integration/utils";
import { createTask } from "@integration/utils/createTask.util";
import { UNEXPECTED_PROPERTY_PROVIDED } from '@root/validators/errors/common.errors';
import { errorMessages, tasksApiErrors } from '@root/common/errors/messages';

describe('PATCH /api/tasks/:id', () => {
    describe('Input Sanitization', () => {
        describe('Validation Rules Wiring', () => {
            test.concurrent('return 400 BAD REQUEST when a unexpected property is sent', async () => {
                const unexpectedProperty = 'newProp';
                const expectedStatus = 400;
                const expectedErrorMssg = UNEXPECTED_PROPERTY_PROVIDED;

                const { sessionToken } = await createUser('editor');
                const { taskId } = await createTask(sessionToken);

                // Update with an unexpected property
                const response = await request(testKit.server)
                    .patch(`${testKit.endpoints.tasksAPI}/${taskId}`)
                    .set('Authorization', `Bearer ${sessionToken}`)
                    .send({ [unexpectedProperty]: 'unexpectedValue' });

                expect(response.statusCode).toBe(expectedStatus);
                expect(response.body).toStrictEqual({ error: expectedErrorMssg })
            });
        });

        test.concurrent('return 400 BAD REQUEST when no field to update is provided', async () => {
            const expectedStatus = 400;
            const expectedErrorMssg = errorMessages.NO_PROPERTIES_PROVIDED_WHEN_UPDATE('task');

            const { sessionToken } = await createUser('editor');
            const { taskId } = await createTask(sessionToken);

            const response = await request(testKit.server)
                .patch(`${testKit.endpoints.tasksAPI}/${taskId}`)
                .set('Authorization', `Bearer ${sessionToken}`)
                .send();

            expect(response.statusCode).toBe(expectedStatus);
            expect(response.body).toStrictEqual({ error: expectedErrorMssg });
        });
    });

    describe('Modification Access Rules Wiring', () => {
        test.concurrent('admins are forbidden to update other admin\'s tasks', async () => {
            const expectedStatus = 403;

            // Create current user
            const { sessionToken: currentUserSessionToken } = await createUser('admin');

            // Create target user and task
            const { sessionToken: targetUserSessionToken } = await createUser('admin');
            const { taskId } = await createTask(targetUserSessionToken);

            // Attempt to update the target user task
            await request(testKit.server)
                .patch(`${testKit.endpoints.tasksAPI}/${taskId}`)
                .set('Authorization', `Bearer ${currentUserSessionToken}`)
                .send({ name: testKit.tasksDataGenerator.name() })
                .expect(expectedStatus);
        });

        test.concurrent('admins are authorized to update editor\'s tasks', async () => {
            // Create admin
            const { sessionToken: currentUserSessionToken } = await createUser('admin');

            // Create editor and task
            const { sessionToken: targetUserSessionToken } = await createUser('editor');
            const { taskId } = await createTask(targetUserSessionToken);

            // Attempt to update the target user task
            await request(testKit.server)
                .patch(`${testKit.endpoints.tasksAPI}/${taskId}`)
                .set('Authorization', `Bearer ${currentUserSessionToken}`)
                .send({ name: testKit.tasksDataGenerator.name() })
                .expect(status2xx);
        });
    });

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

        describe('Duplicated Property Error Handling Wiring', () => {
            test.concurrent('return 409 CONFLICT when task name already exists', async () => {
                const expectedStatus = 409;
                const expectedErrorMssg = tasksApiErrors.TASK_ALREADY_EXISTS('name');

                // Create the original task
                const { sessionToken: user1SessionToken } = await createUser('editor');
                const { taskName: alreadyExistingTaskName } = await createTask(user1SessionToken);

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

    describe('Response', () => {
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
});