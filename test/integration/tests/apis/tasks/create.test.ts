import { FORBIDDEN_MESSAGE } from "@root/rules/errors/messages/error.messages";
import { getSessionToken } from "../../helpers/token/session.token";
import request from "supertest";
import { Certificate } from "crypto";

describe('POST/', () => {
    describe('Create task', () => {
        const taskCreatedSuccessfullyStatus = 201;

        describe('Authentication/Authorization', () => {
            describe('Token not provided', () => {
                test('should return status 401 UNAUTHORIZED', async () => {
                    const expectedStatus = 401;

                    const response = await request(global.SERVER_APP)
                        .post(global.CREATE_TASK_PATH)
                        .send({
                            name: global.TASKS_DATA_GENERATOR.name(),
                            description: global.TASKS_DATA_GENERATOR.description(),
                            status: global.TASKS_DATA_GENERATOR.status(),
                            priority: global.TASKS_DATA_GENERATOR.priority(),
                        });

                    expect(response.status).toBe(expectedStatus);
                    expect(response.body.error).toBe('No token provided');
                });
            });

            describe('User is role readonly', () => {
                test('should not be able to access this feature (403 FORBIDDEN)', async () => {
                    const expectedStatus = 403;

                    // create a readonly user
                    const userCreated = await global.USER_MODEL.create({
                        name: global.USER_DATA_GENERATOR.name(),
                        email: global.USER_DATA_GENERATOR.email(),
                        password: 'secret-password',
                        role: 'readonly'
                    });

                    // generate a session token
                    const readonlyToken = getSessionToken(userCreated.id);

                    // task creation attemp
                    const response = await request(global.SERVER_APP)
                        .post(global.CREATE_TASK_PATH)
                        .send({
                            name: global.TASKS_DATA_GENERATOR.name(),
                            description: global.TASKS_DATA_GENERATOR.description(),
                            status: global.TASKS_DATA_GENERATOR.status(),
                            priority: global.TASKS_DATA_GENERATOR.priority(),
                        })
                        .set('Authorization', `Bearer ${readonlyToken}`)

                    expect(response.status).toBe(expectedStatus);
                    expect(response.body.error).toBe(FORBIDDEN_MESSAGE);
                });
            });

            describe('User is role is editor', () => {
                test('task should be successfully created (201 CREATED)', async () => {
                    const expectedStatus = 201;

                    // create an editor user
                    const userCreated = await global.USER_MODEL.create({
                        name: global.USER_DATA_GENERATOR.name(),
                        email: global.USER_DATA_GENERATOR.email(),
                        password: 'secret-password',
                        role: 'editor'
                    });

                    // generate a session token
                    const editorToken = getSessionToken(userCreated.id);

                    // task creation attemp
                    const response = await request(global.SERVER_APP)
                        .post(global.CREATE_TASK_PATH)
                        .send({
                            name: global.TASKS_DATA_GENERATOR.name(),
                            description: global.TASKS_DATA_GENERATOR.description(),
                            status: global.TASKS_DATA_GENERATOR.status(),
                            priority: global.TASKS_DATA_GENERATOR.priority(),
                        })
                        .set('Authorization', `Bearer ${editorToken}`)

                    expect(response.status).toBe(expectedStatus);
                });
            });

            describe('User role is administrator', () => {
                test('task should be successfully created (201 CREATED) ', async () => {
                    const expectedStatus = 201;

                    // create an administrator
                    const userCreated = await global.USER_MODEL.create({
                        name: global.USER_DATA_GENERATOR.name(),
                        email: global.USER_DATA_GENERATOR.email(),
                        password: 'secret-password',
                        role: 'admin'
                    });

                    // generate a session token
                    const adminToken = getSessionToken(userCreated.id);

                    // task creation attemp
                    const response = await request(global.SERVER_APP)
                        .post(global.CREATE_TASK_PATH)
                        .send({
                            name: global.TASKS_DATA_GENERATOR.name(),
                            description: global.TASKS_DATA_GENERATOR.description(),
                            status: global.TASKS_DATA_GENERATOR.status(),
                            priority: global.TASKS_DATA_GENERATOR.priority(),
                        })
                        .set('Authorization', `Bearer ${adminToken}`)

                    expect(response.status).toBe(expectedStatus);
                });
            });
        });

        describe('Response to client', () => {
            test('should contain the same data as database (200 OK)', async () => {
                // create an editor user
                const userCreated = await global.USER_MODEL.create({
                    name: global.USER_DATA_GENERATOR.name(),
                    email: global.USER_DATA_GENERATOR.email(),
                    password: 'secret-password',
                    role: 'editor'
                });

                // generate a session token
                const editorToken = getSessionToken(userCreated.id);

                // create task
                const createdTaskResponse = await request(global.SERVER_APP)
                    .post(global.CREATE_TASK_PATH)
                    .send({
                        description: global.TASKS_DATA_GENERATOR.description(),
                        name: global.TASKS_DATA_GENERATOR.name().toLowerCase().trim(),
                        status: global.TASKS_DATA_GENERATOR.status(),
                        priority: global.TASKS_DATA_GENERATOR.priority(),
                    })
                    .set('Authorization', `Bearer ${editorToken}`)
                    .expect(taskCreatedSuccessfullyStatus);

                const createdTaskId = createdTaskResponse.body.id;

                const taskInDb = await TASKS_MODEL
                    .findById(createdTaskId)
                    .exec();

                expect(createdTaskResponse.body)
                    .toStrictEqual({
                        ...taskInDb?.toJSON(),
                        user: taskInDb?.user.toString(),
                        createdAt: taskInDb?.createdAt.toISOString(),
                        updatedAt: taskInDb?.updatedAt.toISOString(),
                    });
            });
        });

        describe('Task saved in database', () => {
            test('task name should be converted to lowercase', async () => {
                // create an editor user
                const userCreated = await global.USER_MODEL.create({
                    name: global.USER_DATA_GENERATOR.name(),
                    email: global.USER_DATA_GENERATOR.email(),
                    password: 'secret-password',
                    role: 'editor'
                });

                // generate a session token
                const editorToken = getSessionToken(userCreated.id);

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
                    .expect(taskCreatedSuccessfullyStatus);

                const taskInDb = await TASKS_MODEL
                    .findById(createdTask.body.id)
                    .exec();

                expect(taskInDb?.name).toBe(expectedName);
            });

            test('should save description, status and priority with no changes in database', async () => {
                // create an editor user
                const userCreated = await global.USER_MODEL.create({
                    name: global.USER_DATA_GENERATOR.name(),
                    email: global.USER_DATA_GENERATOR.email(),
                    password: 'secret-password',
                    role: 'editor'
                });

                // generate a session token
                const editorToken = getSessionToken(userCreated.id);

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
                    .expect(taskCreatedSuccessfullyStatus);

                const taskInDb = await TASKS_MODEL
                    .findById(createdTask.body.id)
                    .exec();

                expect(taskInDb?.status).toBe(task.status);
                expect(taskInDb?.description).toBe(task.description);
                expect(taskInDb?.priority).toBe(task.priority);
            });

            test('the property "user" should be the creator id', async () => {
                // create an editor user
                const userCreated = await global.USER_MODEL.create({
                    name: global.USER_DATA_GENERATOR.name(),
                    email: global.USER_DATA_GENERATOR.email(),
                    password: 'secret-password',
                    role: 'editor'
                });

                // generate a session token
                const userId = userCreated.id;
                const editorToken = getSessionToken(userId);

                // create task
                const createdTask = await request(global.SERVER_APP)
                    .post(global.CREATE_TASK_PATH)
                    .send({
                        description: global.TASKS_DATA_GENERATOR.description(),
                        name: global.TASKS_DATA_GENERATOR.name(),
                        status: global.TASKS_DATA_GENERATOR.status(),
                        priority: global.TASKS_DATA_GENERATOR.priority(),
                    })
                    .set('Authorization', `Bearer ${editorToken}`)
                    .expect(taskCreatedSuccessfullyStatus);

                const taskInDb = await TASKS_MODEL
                    .findById(createdTask.body.id)
                    .exec();

                expect(taskInDb?.user.toString()).toBe(userId);
            });
        });

        describe('Client request', () => {
            test('a missing property causes (400 BAD REQUEST)', async () => {
                // THIS ENSURES VALIDATION CLASS IS INTEGRATED CORRECTLY
                const expectedStatus = 400;

                // create an editor user
                const userCreated = await global.USER_MODEL.create({
                    name: global.USER_DATA_GENERATOR.name(),
                    email: global.USER_DATA_GENERATOR.email(),
                    password: 'secret-password',
                    role: 'editor'
                });

                // generate a session token
                const editorToken = getSessionToken(userCreated.id);

                const taskWithoutName = {
                    description: global.TASKS_DATA_GENERATOR.description(),
                    status: global.TASKS_DATA_GENERATOR.status(),
                    priority: global.TASKS_DATA_GENERATOR.priority(),
                };

                // create task
                const response = await request(global.SERVER_APP)
                    .post(global.CREATE_TASK_PATH)
                    .send(taskWithoutName)
                    .set('Authorization', `Bearer ${editorToken}`)

                expect(response.status).toBe(expectedStatus);
                expect(response.body.error).toBe('name should not be null or undefined')
            });

            test('already existing name causes 400 BAD REQUEST', async () => {
                const expectedStatus = 400;

                // create an editor user
                const userCreated = await global.USER_MODEL.create({
                    name: global.USER_DATA_GENERATOR.name(),
                    email: global.USER_DATA_GENERATOR.email(),
                    password: 'secret-password',
                    role: 'editor'
                });

                // generate a session token
                const editorToken = getSessionToken(userCreated.id);

                const createdTask = await request(global.SERVER_APP)
                    .post(global.CREATE_TASK_PATH)
                    .send({
                        name: global.TASKS_DATA_GENERATOR.name(),
                        description: global.TASKS_DATA_GENERATOR.description(),
                        status: global.TASKS_DATA_GENERATOR.status(),
                        priority: global.TASKS_DATA_GENERATOR.priority(),
                    })
                    .set('Authorization', `Bearer ${editorToken}`)
                    .expect(taskCreatedSuccessfullyStatus);

                const previousTaskName = createdTask.body.name;

                // create task using the previous task name
                const response = await request(global.SERVER_APP)
                    .post(global.CREATE_TASK_PATH)
                    .send({
                        name: createdTask.body.name,
                        description: global.TASKS_DATA_GENERATOR.description(),
                        status: global.TASKS_DATA_GENERATOR.status(),
                        priority: global.TASKS_DATA_GENERATOR.priority(),
                    })
                    .set('Authorization', `Bearer ${editorToken}`)

                expect(response.status).toBe(expectedStatus);
                expect(response.body.error)
                    .toBe(`Task with name "${previousTaskName}" already exists`)
            });
        });
    });
});