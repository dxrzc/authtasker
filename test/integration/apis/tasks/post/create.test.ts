import { createPublicKey } from "crypto";
import { getSessionToken } from "../../../helpers/token/session.token";
import request from "supertest";

describe('POST/', () => {
    let editorToken: string;

    beforeAll(async () => {
        const userCreated = await global.USER_MODEL.create({
            name: global.USER_DATA_GENERATOR.name(),
            email: global.USER_DATA_GENERATOR.email(),
            password: 'secret-password',
            role: 'editor'
        });

        editorToken = getSessionToken(userCreated.id);
    });

    describe('Create task', () => {
        test('should successfully create task (201 CREATED)', async () => {
            const expectedStatus = 201;

            const createdTask = await request(global.SERVER_APP)
                .post(global.CREATE_TASK_PATH)
                .send({
                    name: global.TASKS_DATA_GENERATOR.name(),
                    description: global.TASKS_DATA_GENERATOR.description(),
                    status: global.TASKS_DATA_GENERATOR.status(),
                    priority: global.TASKS_DATA_GENERATOR.priority(),
                })
                .set('Authorization', `Bearer ${editorToken}`)
                .expect(expectedStatus);

            // find task in db
            const taskInDb = await TASKS_MODEL
                .findById(createdTask.body.id)
                .exec();

            expect(taskInDb).toBeDefined();
        });

        describe('When task is saved in database', () => {
            test('task name should be converted to lowercase', async () => {
                const expectedName = global.TASKS_DATA_GENERATOR.name()
                    .toLowerCase()
                    .trim();

                const task = {
                    name: expectedName.toUpperCase(),
                    description: global.TASKS_DATA_GENERATOR.description(),
                    status: global.TASKS_DATA_GENERATOR.status(),
                    priority: global.TASKS_DATA_GENERATOR.priority(),
                };

                // create task
                const createdTask = await request(global.SERVER_APP)
                    .post(global.CREATE_TASK_PATH)
                    .send(task)
                    .set('Authorization', `Bearer ${editorToken}`)
                    .expect(201);

                const taskInDb = await TASKS_MODEL
                    .findById(createdTask.body.id)
                    .exec();

                expect(taskInDb?.name).toBe(expectedName);
            });

            test('should save description, status and priority with no changes in database', async () => {
                const task = {
                    description: global.TASKS_DATA_GENERATOR.description(),
                    name: global.TASKS_DATA_GENERATOR.name(),
                    status: global.TASKS_DATA_GENERATOR.status(),
                    priority: global.TASKS_DATA_GENERATOR.priority(),
                };

                // create task
                const createdTask = await request(global.SERVER_APP)
                    .post(global.CREATE_TASK_PATH)
                    .send(task)
                    .set('Authorization', `Bearer ${editorToken}`)
                    .expect(201);

                const taskInDb = await TASKS_MODEL
                    .findById(createdTask.body.id)
                    .exec();

                expect(taskInDb?.status).toBe(task.status);
                expect(taskInDb?.description).toBe(task.description);
                expect(taskInDb?.priority).toBe(task.priority);
            });
        });

        describe('Response to client', () => {
            test('should contain the same database data', async () => {
                const task = {
                    description: global.TASKS_DATA_GENERATOR.description(),
                    name: global.TASKS_DATA_GENERATOR.name(),
                    status: global.TASKS_DATA_GENERATOR.status(),
                    priority: global.TASKS_DATA_GENERATOR.priority(),
                };

                // create task
                const createdTask = await request(global.SERVER_APP)
                    .post(global.CREATE_TASK_PATH)
                    .send(task)
                    .set('Authorization', `Bearer ${editorToken}`)
                    .expect(201);

                const taskInDb = await TASKS_MODEL
                    .findById(createdTask.body.id)
                    .exec();

                expect(taskInDb?.name).toBe(createdTask.body.name);
                expect(taskInDb?.status).toBe(createdTask.body.status);
                expect(taskInDb?.description).toBe(createdTask.body.description);
                expect(taskInDb?.priority).toBe(createdTask.body.priority);
            });
        });

        describe('Client request', () => {
            test('a missing property causes 400 BAD REQUEST', async () => {
                const expectedStatus = 400;

                const taskWithoutName = {
                    description: global.TASKS_DATA_GENERATOR.description(),
                    status: global.TASKS_DATA_GENERATOR.status(),
                    priority: global.TASKS_DATA_GENERATOR.priority(),
                };

                // create task
                await request(global.SERVER_APP)
                    .post(global.CREATE_TASK_PATH)
                    .send(taskWithoutName)
                    .set('Authorization', `Bearer ${editorToken}`)
                    .expect(expectedStatus);
            });

            test('already existing name causes 400 BAD REQUEST', async () => {
                const expectedStatus = 400;

                const createdTask = await request(global.SERVER_APP)
                    .post(global.CREATE_TASK_PATH)
                    .send({
                        name: global.TASKS_DATA_GENERATOR.name(),
                        description: global.TASKS_DATA_GENERATOR.description(),
                        status: global.TASKS_DATA_GENERATOR.status(),
                        priority: global.TASKS_DATA_GENERATOR.priority(),
                    })
                    .set('Authorization', `Bearer ${editorToken}`)
                    .expect(201);

                // create task using the previous task name
                await request(global.SERVER_APP)
                    .post(global.CREATE_TASK_PATH)
                    .send({
                        name: createdTask.body.name,
                        description: global.TASKS_DATA_GENERATOR.description(),
                        status: global.TASKS_DATA_GENERATOR.status(),
                        priority: global.TASKS_DATA_GENERATOR.priority(),
                    })
                    .set('Authorization', `Bearer ${editorToken}`)
                    .expect(expectedStatus);
            });
        });
    });
});