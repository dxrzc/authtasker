import request from "supertest";
import mongoose from "mongoose";
import { getSessionToken } from "../../helpers/token/session.token";
import { FORBIDDEN_MESSAGE } from "@root/rules/errors/messages/error.messages";

describe('PATCH/', () => {
    describe('Update task', () => {
        const taskSuccessfullyUpdatedStatus = 200;

        describe('Authentication/Authorization', () => {
            describe('No token provided', () => {
                test('should return status 401 UNAUTHORIZED', async () => {
                    const expectedStatus = 401;

                    const response = await request(global.SERVER_APP)
                        .patch(`${global.TASKS_PATH}/123`)
                        .send({})

                    expect(response.statusCode).toBe(expectedStatus);
                    expect(response.body.error).toBe('No token provided');
                });
            });

            describe('User is role readonly', () => {
                test('should not be able to delete their own tasks (assuming the role was degraded)', async () => {
                    const expectedStatus = 403;

                    // create a readonly user
                    const readonlyUser = await global.USER_MODEL.create({
                        name: global.USER_DATA_GENERATOR.name(),
                        email: global.USER_DATA_GENERATOR.email(),
                        password: 'secret-password',
                        role: 'readonly'
                    });

                    // create a task for the readonly user
                    const task = await global.TASKS_MODEL.create({
                        name: global.TASKS_DATA_GENERATOR.name(),
                        description: global.TASKS_DATA_GENERATOR.description(),
                        status: global.TASKS_DATA_GENERATOR.status(),
                        priority: global.TASKS_DATA_GENERATOR.priority(),
                        user: readonlyUser.id
                    });

                    const readonlyUserTaskId = task.id;
                    const readonlyUserToken = getSessionToken(readonlyUser.id);

                    // update task using the readonly user token
                    const updateTaskResponse = await request(global.SERVER_APP)
                        .patch(`${global.TASKS_PATH}/${readonlyUserTaskId}`)
                        .send({ name: global.USER_DATA_GENERATOR.name() })
                        .set('Authorization', `Bearer ${readonlyUserToken}`);
                    
                    expect(updateTaskResponse.statusCode).toBe(expectedStatus);
                    expect(updateTaskResponse.body.error).toBe(FORBIDDEN_MESSAGE);
                });

                test('should not be able to update another readonly user task (403 FORBIDDEN)', async () => {
                    const expectedStatus = 403;

                    // create a readonly user
                    const readonlyUser = await global.USER_MODEL.create({
                        name: global.USER_DATA_GENERATOR.name(),
                        email: global.USER_DATA_GENERATOR.email(),
                        password: 'secret-password',
                        role: 'readonly'
                    });

                    const readonlyUserToken = getSessionToken(readonlyUser.id);

                    // create another readonly user
                    const anotherReadonlyUser = await global.USER_MODEL.create({
                        name: global.USER_DATA_GENERATOR.name(),
                        email: global.USER_DATA_GENERATOR.email(),
                        password: 'secret-password',
                        role: 'readonly'
                    });

                    // create a task for the another readonly user
                    const task = await global.TASKS_MODEL.create({
                        name: global.TASKS_DATA_GENERATOR.name(),
                        description: global.TASKS_DATA_GENERATOR.description(),
                        status: global.TASKS_DATA_GENERATOR.status(),
                        priority: global.TASKS_DATA_GENERATOR.priority(),
                        user: anotherReadonlyUser.id
                    });

                    const readonlyUser2TaskId = task.id;

                    // update task using the first readonly user token
                    const updateTaskResponse = await request(global.SERVER_APP)
                        .patch(`${global.TASKS_PATH}/${readonlyUser2TaskId}`)
                        .send({ name: global.USER_DATA_GENERATOR.name() })
                        .set('Authorization', `Bearer ${readonlyUserToken}`);

                    expect(updateTaskResponse.statusCode).toBe(expectedStatus);
                    expect(updateTaskResponse.body.error).toBe(FORBIDDEN_MESSAGE);
                });

                test('should not be able to update an editor user task (403 FORBIDDEN)', async () => {
                    const expectedStatus = 403;

                    // create a readonly user
                    const readonlyUser = await global.USER_MODEL.create({
                        name: global.USER_DATA_GENERATOR.name(),
                        email: global.USER_DATA_GENERATOR.email(),
                        password: 'secret-password',
                        role: 'readonly'
                    });

                    const readonlyUserToken = getSessionToken(readonlyUser.id);

                    // create an editor user
                    const editorUser = await global.USER_MODEL.create({
                        name: global.USER_DATA_GENERATOR.name(),
                        email: global.USER_DATA_GENERATOR.email(),
                        password: 'secret-password',
                        role: 'editor'
                    });

                    // create a task for the editor user
                    const task = await global.TASKS_MODEL.create({
                        name: global.TASKS_DATA_GENERATOR.name(),
                        description: global.TASKS_DATA_GENERATOR.description(),
                        status: global.TASKS_DATA_GENERATOR.status(),
                        priority: global.TASKS_DATA_GENERATOR.priority(),
                        user: editorUser.id
                    });

                    const editorUserTaskId = task.id;

                    // attempt to update task using the readonly user token
                    const updateTaskResponse = await request(global.SERVER_APP)
                        .patch(`${global.TASKS_PATH}/${editorUserTaskId}`)
                        .send({ name: global.USER_DATA_GENERATOR.name() })
                        .set('Authorization', `Bearer ${readonlyUserToken}`);

                    expect(updateTaskResponse.statusCode).toBe(expectedStatus);
                    expect(updateTaskResponse.body.error).toBe(FORBIDDEN_MESSAGE);
                });

                test('should not be able to update an administrator task (403 FORBIDDEN)', async () => {
                    const expectedStatus = 403;

                    // create a readonly user
                    const readonlyUser = await global.USER_MODEL.create({
                        name: global.USER_DATA_GENERATOR.name(),
                        email: global.USER_DATA_GENERATOR.email(),
                        password: 'secret-password',
                        role: 'readonly'
                    });

                    const readonlyUserToken = getSessionToken(readonlyUser.id);

                    // create an admin user
                    const adminUser = await global.USER_MODEL.create({
                        name: global.USER_DATA_GENERATOR.name(),
                        email: global.USER_DATA_GENERATOR.email(),
                        password: 'secret-password',
                        role: 'admin'
                    });

                    // create a task for the admin user
                    const task = await global.TASKS_MODEL.create({
                        name: global.TASKS_DATA_GENERATOR.name(),
                        description: global.TASKS_DATA_GENERATOR.description(),
                        status: global.TASKS_DATA_GENERATOR.status(),
                        priority: global.TASKS_DATA_GENERATOR.priority(),
                        user: adminUser.id
                    });

                    const adminUserTaskId = task.id;

                    // attempt to update task using the readonly user token
                    const updateTaskResponse = await request(global.SERVER_APP)
                        .patch(`${global.TASKS_PATH}/${adminUserTaskId}`)
                        .send({ name: global.USER_DATA_GENERATOR.name() })
                        .set('Authorization', `Bearer ${readonlyUserToken}`);

                    expect(updateTaskResponse.statusCode).toBe(expectedStatus);
                    expect(updateTaskResponse.body.error).toBe(FORBIDDEN_MESSAGE);
                });
            });

            describe('User is role editor', () => {
                test('should not be able to update a readonly user task (403 FORBIDDEN)', async () => {
                    const expectedStatus = 403;

                    // create an editor user
                    const editorUser = await global.USER_MODEL.create({
                        name: global.USER_DATA_GENERATOR.name(),
                        email: global.USER_DATA_GENERATOR.email(),
                        password: 'secret-password',
                        role: 'editor'
                    });

                    // create a readonly user
                    const readonlyUser = await global.USER_MODEL.create({
                        name: global.USER_DATA_GENERATOR.name(),
                        email: global.USER_DATA_GENERATOR.email(),
                        password: 'secret-password',
                        role: 'readonly'
                    });

                    // create task for the readonly user
                    const readonlyUserTask = await global.TASKS_MODEL.create({
                        name: global.TASKS_DATA_GENERATOR.name(),
                        description: global.TASKS_DATA_GENERATOR.description(),
                        status: global.TASKS_DATA_GENERATOR.status(),
                        priority: global.TASKS_DATA_GENERATOR.priority(),
                        user: readonlyUser.id
                    });

                    const editorUserToken = getSessionToken(editorUser.id);
                    const readonlyUserTaskId = readonlyUserTask.id;

                    // attempt to update the readonly user task using the editor user token
                    const updateTaskResponse = await request(global.SERVER_APP)
                        .patch(`${global.TASKS_PATH}/${readonlyUserTaskId}`)
                        .send({ name: global.USER_DATA_GENERATOR.name() })
                        .set('Authorization', `Bearer ${editorUserToken}`);

                    expect(updateTaskResponse.statusCode).toBe(expectedStatus);
                    expect(updateTaskResponse.body.error).toBe(FORBIDDEN_MESSAGE);
                });

                test('should be able to update their own task (200 OK)', async () => {
                    const expectedStatus = 200;

                    // create an editor user
                    const editorUser = await global.USER_MODEL.create({
                        name: global.USER_DATA_GENERATOR.name(),
                        email: global.USER_DATA_GENERATOR.email(),
                        password: 'secret-password',
                        role: 'editor'
                    });

                    const editorUserToken = getSessionToken(editorUser.id);

                    // create a task for the editor user
                    const editorUserTask = await global.TASKS_MODEL.create({
                        name: global.TASKS_DATA_GENERATOR.name(),
                        description: global.TASKS_DATA_GENERATOR.description(),
                        status: global.TASKS_DATA_GENERATOR.status(),
                        priority: global.TASKS_DATA_GENERATOR.priority(),
                        user: editorUser.id
                    });

                    const editorUserTaskId = editorUserTask.id;
                    const updatedTaskName = global.TASKS_DATA_GENERATOR.name();

                    // attempt to update their own task
                    const updateTaskResponse = await request(global.SERVER_APP)
                        .patch(`${global.TASKS_PATH}/${editorUserTaskId}`)
                        .send({ name: updatedTaskName })
                        .set('Authorization', `Bearer ${editorUserToken}`);

                    expect(updateTaskResponse.statusCode).toBe(expectedStatus);
                });

                test('should not be able to update another editor user task (403 FORBIDDEN)', async () => {
                    const expectedStatus = 403;

                    // create the first editor user
                    const firstEditorUser = await global.USER_MODEL.create({
                        name: global.USER_DATA_GENERATOR.name(),
                        email: global.USER_DATA_GENERATOR.email(),
                        password: 'secret-password',
                        role: 'editor'
                    });

                    const firstEditorUserToken = getSessionToken(firstEditorUser.id);

                    // create a second editor user
                    const secondEditorUser = await global.USER_MODEL.create({
                        name: global.USER_DATA_GENERATOR.name(),
                        email: global.USER_DATA_GENERATOR.email(),
                        password: 'secret-password',
                        role: 'editor'
                    });

                    // create a task for the second editor user
                    const secondEditorUserTask = await global.TASKS_MODEL.create({
                        name: global.TASKS_DATA_GENERATOR.name(),
                        description: global.TASKS_DATA_GENERATOR.description(),
                        status: global.TASKS_DATA_GENERATOR.status(),
                        priority: global.TASKS_DATA_GENERATOR.priority(),
                        user: secondEditorUser.id
                    });

                    const secondEditorUserTaskId = secondEditorUserTask.id;

                    // attempt to update the second editor user's task using the first editor user's token
                    const updateTaskResponse = await request(global.SERVER_APP)
                        .patch(`${global.TASKS_PATH}/${secondEditorUserTaskId}`)
                        .send({ name: global.TASKS_DATA_GENERATOR.name() })
                        .set('Authorization', `Bearer ${firstEditorUserToken}`);

                    expect(updateTaskResponse.statusCode).toBe(expectedStatus);
                    expect(updateTaskResponse.body.error).toBe(FORBIDDEN_MESSAGE);
                });

                test('should not be able to update an administrator task (403 FORBIDDEN)', async () => {
                    const expectedStatus = 403;

                    // create an editor user
                    const editorUser = await global.USER_MODEL.create({
                        name: global.USER_DATA_GENERATOR.name(),
                        email: global.USER_DATA_GENERATOR.email(),
                        password: 'secret-password',
                        role: 'editor'
                    });

                    const editorUserToken = getSessionToken(editorUser.id);

                    // create an administrator user
                    const adminUser = await global.USER_MODEL.create({
                        name: global.USER_DATA_GENERATOR.name(),
                        email: global.USER_DATA_GENERATOR.email(),
                        password: 'secret-password',
                        role: 'admin'
                    });

                    // create a task for the administrator user
                    const adminUserTask = await global.TASKS_MODEL.create({
                        name: global.TASKS_DATA_GENERATOR.name(),
                        description: global.TASKS_DATA_GENERATOR.description(),
                        status: global.TASKS_DATA_GENERATOR.status(),
                        priority: global.TASKS_DATA_GENERATOR.priority(),
                        user: adminUser.id
                    });

                    const adminUserTaskId = adminUserTask.id;

                    // attempt to update the administrator user's task using the editor user's token
                    const updateTaskResponse = await request(global.SERVER_APP)
                        .patch(`${global.TASKS_PATH}/${adminUserTaskId}`)
                        .send({ name: global.TASKS_DATA_GENERATOR.name() })
                        .set('Authorization', `Bearer ${editorUserToken}`);

                    expect(updateTaskResponse.statusCode).toBe(expectedStatus);
                    expect(updateTaskResponse.body.error).toBe(FORBIDDEN_MESSAGE);
                });
            });            

            describe('User is role administrator', () => {
                test('should be able to update a readonly user task (200 OK)', async () => {
                    const expectedStatus = 200;

                    // create an administrator user
                    const adminUser = await global.USER_MODEL.create({
                        name: global.USER_DATA_GENERATOR.name(),
                        email: global.USER_DATA_GENERATOR.email(),
                        password: 'secret-password',
                        role: 'admin'
                    });

                    const adminUserToken = getSessionToken(adminUser.id);

                    // create a readonly user
                    const readonlyUser = await global.USER_MODEL.create({
                        name: global.USER_DATA_GENERATOR.name(),
                        email: global.USER_DATA_GENERATOR.email(),
                        password: 'secret-password',
                        role: 'readonly'
                    });

                    // create a task for the readonly user
                    const readonlyUserTask = await global.TASKS_MODEL.create({
                        name: global.TASKS_DATA_GENERATOR.name(),
                        description: global.TASKS_DATA_GENERATOR.description(),
                        status: global.TASKS_DATA_GENERATOR.status(),
                        priority: global.TASKS_DATA_GENERATOR.priority(),
                        user: readonlyUser.id
                    });

                    const readonlyUserTaskId = readonlyUserTask.id;                    

                    // update the readonly user's task using the admin user's token
                    const updateTaskResponse = await request(global.SERVER_APP)
                        .patch(`${global.TASKS_PATH}/${readonlyUserTaskId}`)
                        .send({ name: global.TASKS_DATA_GENERATOR.name() })
                        .set('Authorization', `Bearer ${adminUserToken}`);

                    expect(updateTaskResponse.statusCode).toBe(expectedStatus);
                });

                test('should be able to update an editor user task (200 OK)', async () => {
                    const expectedStatus = 200;

                    // create an administrator user
                    const adminUser = await global.USER_MODEL.create({
                        name: global.USER_DATA_GENERATOR.name(),
                        email: global.USER_DATA_GENERATOR.email(),
                        password: 'secret-password',
                        role: 'admin'
                    });

                    const adminUserToken = getSessionToken(adminUser.id);

                    // create an editor user
                    const editorUser = await global.USER_MODEL.create({
                        name: global.USER_DATA_GENERATOR.name(),
                        email: global.USER_DATA_GENERATOR.email(),
                        password: 'secret-password',
                        role: 'editor'
                    });

                    // create a task for the editor user
                    const editorUserTask = await global.TASKS_MODEL.create({
                        name: global.TASKS_DATA_GENERATOR.name(),
                        description: global.TASKS_DATA_GENERATOR.description(),
                        status: global.TASKS_DATA_GENERATOR.status(),
                        priority: global.TASKS_DATA_GENERATOR.priority(),
                        user: editorUser.id
                    });

                    const editorUserTaskId = editorUserTask.id;
                    const updatedTaskName = global.TASKS_DATA_GENERATOR.name();

                    // update the editor user's task using the admin user's token
                    const updateTaskResponse = await request(global.SERVER_APP)
                        .patch(`${global.TASKS_PATH}/${editorUserTaskId}`)
                        .send({ name: updatedTaskName })
                        .set('Authorization', `Bearer ${adminUserToken}`);

                    expect(updateTaskResponse.statusCode).toBe(expectedStatus);
                });

                test('should be able to update their own tasks (200 OK)', async () => {
                    const expectedStatus = 200;

                    // create an administrator user
                    const adminUser = await global.USER_MODEL.create({
                        name: global.USER_DATA_GENERATOR.name(),
                        email: global.USER_DATA_GENERATOR.email(),
                        password: 'secret-password',
                        role: 'admin'
                    });

                    const adminUserToken = getSessionToken(adminUser.id);

                    // create a task for the admin user
                    const adminUserTask = await global.TASKS_MODEL.create({
                        name: global.TASKS_DATA_GENERATOR.name(),
                        description: global.TASKS_DATA_GENERATOR.description(),
                        status: global.TASKS_DATA_GENERATOR.status(),
                        priority: global.TASKS_DATA_GENERATOR.priority(),
                        user: adminUser.id
                    });

                    const adminUserTaskId = adminUserTask.id;                    

                    // update the admin user's own task
                    const updateTaskResponse = await request(global.SERVER_APP)
                        .patch(`${global.TASKS_PATH}/${adminUserTaskId}`)
                        .send({ name: global.TASKS_DATA_GENERATOR.name() })
                        .set('Authorization', `Bearer ${adminUserToken}`);

                    expect(updateTaskResponse.statusCode).toBe(expectedStatus);
                });

                test('should not be able to update another administrator task (403 FORBIDDEN)', async () => {
                    const expectedStatus = 403;

                    // create the first administrator user
                    const firstAdminUser = await global.USER_MODEL.create({
                        name: global.USER_DATA_GENERATOR.name(),
                        email: global.USER_DATA_GENERATOR.email(),
                        password: 'secret-password',
                        role: 'admin'
                    });

                    const firstAdminUserToken = getSessionToken(firstAdminUser.id);

                    // create a second administrator user
                    const secondAdminUser = await global.USER_MODEL.create({
                        name: global.USER_DATA_GENERATOR.name(),
                        email: global.USER_DATA_GENERATOR.email(),
                        password: 'secret-password',
                        role: 'admin'
                    });

                    // create a task for the second administrator user
                    const secondAdminUserTask = await global.TASKS_MODEL.create({
                        name: global.TASKS_DATA_GENERATOR.name(),
                        description: global.TASKS_DATA_GENERATOR.description(),
                        status: global.TASKS_DATA_GENERATOR.status(),
                        priority: global.TASKS_DATA_GENERATOR.priority(),
                        user: secondAdminUser.id
                    });

                    const secondAdminUserTaskId = secondAdminUserTask.id;

                    // attempt to update the second admin's task using the first admin's token
                    const updateTaskResponse = await request(global.SERVER_APP)
                        .patch(`${global.TASKS_PATH}/${secondAdminUserTaskId}`)
                        .send({ name: global.TASKS_DATA_GENERATOR.name() })
                        .set('Authorization', `Bearer ${firstAdminUserToken}`);

                    expect(updateTaskResponse.statusCode).toBe(expectedStatus);
                    expect(updateTaskResponse.body.error).toBe(FORBIDDEN_MESSAGE);
                });
            });
        });

        describe('Database', () => {
            test('changes should be reflected in database', async () => {
                // create an editor user
                const user = await global.USER_MODEL.create({
                    name: global.USER_DATA_GENERATOR.name(),
                    email: global.USER_DATA_GENERATOR.email(),
                    password: 'secret-password',
                    role: 'editor'
                });

                const token = getSessionToken(user.id);

                // create a task
                const task = await global.TASKS_MODEL.create({
                    name: global.TASKS_DATA_GENERATOR.name(),
                    description: global.TASKS_DATA_GENERATOR.description(),
                    status: global.TASKS_DATA_GENERATOR.status(),
                    priority: global.TASKS_DATA_GENERATOR.priority(),
                    user: user.id
                });

                const taskId = task.id;

                const newTaskProperties = {
                    name: global.TASKS_DATA_GENERATOR.name(),
                    description: global.TASKS_DATA_GENERATOR.description(),
                    status: global.TASKS_DATA_GENERATOR.status(),
                };

                // update the task
                await request(global.SERVER_APP)
                    .patch(`${global.TASKS_PATH}/${taskId}`)
                    .send(newTaskProperties)
                    .set('Authorization', `Bearer ${token}`)
                    .expect(taskSuccessfullyUpdatedStatus);

                // find task in database
                const updatedTask = await global.TASKS_MODEL
                    .findById(task.id)
                    .exec();

                // check if task was updated
                expect(updatedTask?.name).toBe(newTaskProperties.name);
                expect(updatedTask?.description).toBe(newTaskProperties.description);
                expect(updatedTask?.status).toBe(newTaskProperties.status);
            });
        });

        describe('Client request', () => {
            describe('Task name already exists', () => {
                test('should return 400 bad request', async () => {
                    const expectedStatus = 400;

                    // create an editor user
                    const user = await global.USER_MODEL.create({
                        name: global.USER_DATA_GENERATOR.name(),
                        email: global.USER_DATA_GENERATOR.email(),
                        password: 'secret-password',
                        role: 'editor'
                    });

                    const token = getSessionToken(user.id);

                    // create a task
                    const task = await global.TASKS_MODEL.create({
                        name: global.TASKS_DATA_GENERATOR.name(),
                        description: global.TASKS_DATA_GENERATOR.description(),
                        status: global.TASKS_DATA_GENERATOR.status(),
                        priority: global.TASKS_DATA_GENERATOR.priority(),
                        user: user.id
                    });

                    // create another task                    
                    const anotherTask = await global.TASKS_MODEL.create({
                        name: global.TASKS_DATA_GENERATOR.name(),
                        description: global.TASKS_DATA_GENERATOR.description(),
                        status: global.TASKS_DATA_GENERATOR.status(),
                        priority: global.TASKS_DATA_GENERATOR.priority(),
                        user: user.id
                    });

                    const newTaskProperties = {
                        name: anotherTask.name,
                    };

                    // update the task
                    const updateTaskResponse = await request(global.SERVER_APP)
                        .patch(`${global.TASKS_PATH}/${task.id}`)
                        .send(newTaskProperties)
                        .set('Authorization', `Bearer ${token}`)

                    expect(updateTaskResponse.statusCode).toBe(expectedStatus);
                    expect(updateTaskResponse.body.error)
                        .toBe(`Task with name "${newTaskProperties.name}" already exists`);
                });
            });

            describe('Task id is not valid', () => {
                test('should return status 404 NOT FOUND', async () => {
                    const expectedStatus = 404;

                    // create a user in order to send a valid token
                    const user = await global.USER_MODEL.create({
                        name: global.USER_DATA_GENERATOR.name(),
                        email: global.USER_DATA_GENERATOR.email(),
                        password: 'secret-password',
                        role: 'editor'
                    });

                    const token = getSessionToken(user.id);

                    // send a non valid id
                    const invalidId = '123';

                    const updateTaskResponse = await request(global.SERVER_APP)
                        .patch(`${global.TASKS_PATH}/${invalidId}`)
                        .send({ name: 'new name' })
                        .set('Authorization', `Bearer ${token}`)

                    expect(updateTaskResponse.statusCode).toBe(expectedStatus);
                    expect(updateTaskResponse.body.error)
                        .toBe(`Task with id ${invalidId} not found`);
                });
            });

            describe('Task id is not found', () => {
                test('should return status 404 NOT FOUND', async () => {
                    const expectedStatus = 404;

                    // create a user in order to send a valid token
                    const user = await global.USER_MODEL.create({
                        name: global.USER_DATA_GENERATOR.name(),
                        email: global.USER_DATA_GENERATOR.email(),
                        password: 'secret-password',
                        role: 'editor'
                    });

                    const token = getSessionToken(user.id);

                    // send a valid mongoose id
                    const validMongooseId = new mongoose.Types.ObjectId();

                    const updateTaskResponse = await request(global.SERVER_APP)
                        .patch(`${global.TASKS_PATH}/${validMongooseId}`)
                        .send({ name: 'new name' })
                        .set('Authorization', `Bearer ${token}`)

                    expect(updateTaskResponse.statusCode).toBe(expectedStatus);
                    expect(updateTaskResponse.body.error)
                        .toBe(`Task with id ${validMongooseId} not found`);
                });
            });

            describe('No properties provided', () => {
                test('should return status 400 BAD REQUEST', async () => {
                    const expectedStatus = 400;

                    // create a user in order to send a valid token
                    const user = await global.USER_MODEL.create({
                        name: global.USER_DATA_GENERATOR.name(),
                        email: global.USER_DATA_GENERATOR.email(),
                        password: 'secret-password',
                        role: 'editor'
                    });

                    const token = getSessionToken(user.id);

                    // create a task
                    const task = await global.TASKS_MODEL.create({
                        name: global.TASKS_DATA_GENERATOR.name(),
                        description: global.TASKS_DATA_GENERATOR.description(),
                        status: global.TASKS_DATA_GENERATOR.status(),
                        priority: global.TASKS_DATA_GENERATOR.priority(),
                        user: user.id
                    });

                    const updateTaskResponse = await request(global.SERVER_APP)
                        .patch(`${global.TASKS_PATH}/${task.id}`)
                        .send({}) // no properties provided
                        .set('Authorization', `Bearer ${token}`);

                    expect(updateTaskResponse.statusCode).toBe(expectedStatus);
                    expect(updateTaskResponse.body.error)
                        .toBe(`At least one field is required to update the task`);
                });
            });
        });
    });
});