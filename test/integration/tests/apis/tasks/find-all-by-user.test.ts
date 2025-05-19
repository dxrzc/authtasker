import request from "supertest";
import { getSessionToken } from "../../helpers/token/session.token";
import mongoose from "mongoose";

describe('GET/', () => {
    describe('Find all by user', () => {
        const tasksFoundSuccessfullyStatus = 200;

        describe('Authentication/Authorization', () => {
            describe('Token not provided', () => {
                test('should not be able to access this feature (401 UNAUTHORIZED)', async () => {
                    const expectedStatus = 401;

                    const response = await request(global.SERVER_APP)
                        .get(`${global.TASKS_PATH}/allByUser/123`);

                    expect(response.status).toBe(expectedStatus);
                    expect(response.body.error).toBe('No token provided');
                });
            });

            describe('User role is readonly', () => {
                test('should be able to access this feature (200 OK)', async () => {
                    const expectedStatus = 200;

                    // create a readonly user
                    const userCreated = await global.USER_MODEL.create({
                        name: global.USER_DATA_GENERATOR.name(),
                        email: global.USER_DATA_GENERATOR.email(),
                        password: 'secret-password',
                        role: 'readonly'
                    });

                    const userReadonlyToken = getSessionToken(userCreated.id);
                    const userId = userCreated.id;

                    await request(global.SERVER_APP)
                        .get(`${global.TASKS_PATH}/allByUser/${userId}`)
                        .set('Authorization', `Bearer ${userReadonlyToken}`)
                        .expect(expectedStatus);
                });
            });

            describe('User role is editor', () => {
                test('should be able to access this feature (200 OK)', async () => {
                    const expectedStatus = 200;

                    // create an editor user
                    const userCreated = await global.USER_MODEL.create({
                        name: global.USER_DATA_GENERATOR.name(),
                        email: global.USER_DATA_GENERATOR.email(),
                        password: 'secret-password',
                        role: 'editor'
                    });

                    const userEditorToken = getSessionToken(userCreated.id);
                    const userId = userCreated.id;

                    await request(global.SERVER_APP)
                        .get(`${global.TASKS_PATH}/allByUser/${userId}`)
                        .set('Authorization', `Bearer ${userEditorToken}`)
                        .expect(expectedStatus);
                });
            });

            describe('User role is administrator', () => {
                test('should be able to access this feature (200 OK)', async () => {
                    const expectedStatus = 200;

                    // create an administrator user
                    const userCreated = await global.USER_MODEL.create({
                        name: global.USER_DATA_GENERATOR.name(),
                        email: global.USER_DATA_GENERATOR.email(),
                        password: 'secret-password',
                        role: 'admin'
                    });

                    const userAdminToken = getSessionToken(userCreated.id);
                    const userId = userCreated.id;

                    await request(global.SERVER_APP)
                        .get(`${global.TASKS_PATH}/allByUser/${userId}`)
                        .set('Authorization', `Bearer ${userAdminToken}`)
                        .expect(expectedStatus);
                });
            });
        });

        describe('Id is not valid', () => {
            test('should return status 404 NOT FOUND', async () => {
                const expectedStatus = 404;

                // create a readonly user
                const userCreated = await global.USER_MODEL.create({
                    name: global.USER_DATA_GENERATOR.name(),
                    email: global.USER_DATA_GENERATOR.email(),
                    password: 'secret-password',
                    role: 'readonly'
                });

                const userReadonlyToken = getSessionToken(userCreated.id);
                const invalidMongoId = '123';

                const response = await request(global.SERVER_APP)
                    .get(`${global.TASKS_PATH}/allByUser/${invalidMongoId}`)
                    .set('Authorization', `Bearer ${userReadonlyToken}`);

                expect(response.status).toBe(expectedStatus);
                expect(response.body.error).toBe(`User with id ${invalidMongoId} not found`);
            });
        });

        describe('User is not found', () => {
            test('should return status 404 NOT FOUND', async () => {
                const expectedStatus = 404;

                // create a readonly user
                const userCreated = await global.USER_MODEL.create({
                    name: global.USER_DATA_GENERATOR.name(),
                    email: global.USER_DATA_GENERATOR.email(),
                    password: 'secret-password',
                    role: 'readonly'
                });

                const userReadonlyToken = getSessionToken(userCreated.id);
                const validMongooseId = new mongoose.Types.ObjectId();

                const response = await request(global.SERVER_APP)
                    .get(`${global.TASKS_PATH}/allByUser/${validMongooseId}`)
                    .set('Authorization', `Bearer ${userReadonlyToken}`);

                expect(response.status).toBe(expectedStatus);
                expect(response.body.error).toBe(`User with id ${validMongooseId} not found`);
            });
        });

        describe('User has no tasks associated', () => {
            test('should return an empty array', async () => {
                // create a editor user
                const userCreated = await global.USER_MODEL.create({
                    name: global.USER_DATA_GENERATOR.name(),
                    email: global.USER_DATA_GENERATOR.email(),
                    password: 'secret-password',
                    role: 'editor'
                });

                const token = getSessionToken(userCreated.id);

                const response = await request(global.SERVER_APP)
                    .get(`${global.TASKS_PATH}/allByUser/${userCreated.id}`)
                    .set('Authorization', `Bearer ${token}`)
                    .expect(tasksFoundSuccessfullyStatus);

                expect(response.body).toEqual([]);
            });
        });

        describe('User create 5 tasks', () => {
            test('should return 5 tasks', async () => {
                const expectedBodyLength = 5;

                // create an editor user
                const userCreated = await global.USER_MODEL.create({
                    name: global.USER_DATA_GENERATOR.name(),
                    email: global.USER_DATA_GENERATOR.email(),
                    password: 'secret-password',
                    role: 'editor'
                });

                const token = getSessionToken(userCreated.id);

                for (let i = 0; i < 5; i++) {
                    await global.TASKS_MODEL.create({
                        name: global.TASKS_DATA_GENERATOR.name(),
                        description: global.TASKS_DATA_GENERATOR.description(),
                        status: global.TASKS_DATA_GENERATOR.status(),
                        priority: global.TASKS_DATA_GENERATOR.priority(),
                        user: userCreated.id
                    });
                }

                const response = await request(global.SERVER_APP)
                    .get(`${global.TASKS_PATH}/allByUser/${userCreated.id}`)
                    .set('Authorization', `Bearer ${token}`)
                    .expect(tasksFoundSuccessfullyStatus);;

                expect(response.body).toHaveLength(expectedBodyLength);
                response.body.forEach((task: any) => {
                    expect(task).toStrictEqual({
                        name: expect.any(String),
                        description: expect.any(String),
                        status: expect.any(String),
                        priority: expect.any(String),
                        user: userCreated.id,
                        createdAt: expect.any(String),
                        updatedAt: expect.any(String),
                        id: expect.any(String),
                    });
                });
            });
        });
    });
});