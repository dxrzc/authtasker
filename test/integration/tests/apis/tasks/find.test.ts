import request from "supertest";
import { getSessionToken } from "../../helpers/token/session.token";

describe('GET/', () => {
    describe('Find many by pagination', () => {
        const tasksSuccessfullyFoundStatus = 200;

        describe('Authentication/Authorization', () => {
            describe('Token not provided', () => {
                test('should not be able to access this feature (401 UNAUTHORIZED)', async () => {
                    const expectedStatus = 401;

                    const response = await request(global.SERVER_APP)
                        .get(`${global.TASKS_PATH}`)
                        .query({ page: 1, limit: 3 });

                    expect(response.status).toBe(expectedStatus);
                    expect(response.body.error).toBe('No token provided');
                });
            });

            describe('User role is readonly', () => {
                test('should be able to access this feature (200 OK)', async () => {
                    const expectedStatus = 200;

                    // create a readonly user
                    const readonlyUser = await global.USER_MODEL.create({
                        name: global.USER_DATA_GENERATOR.name(),
                        email: global.USER_DATA_GENERATOR.email(),
                        password: global.USER_DATA_GENERATOR.password(),
                        role: 'readonly'
                    });

                    const token = getSessionToken(readonlyUser.id);

                    await request(global.SERVER_APP)
                        .get(`${global.TASKS_PATH}`)
                        .query({ page: 1, limit: 3 })
                        .set('Authorization', `Bearer ${token}`)
                        .expect(expectedStatus);
                });
            });

            describe('User role is editor', () => {
                test('should be able to access this feature (200 OK)', async () => {
                    const expectedStatus = 200;

                    // create an editor user
                    const editorUser = await global.USER_MODEL.create({
                        name: global.USER_DATA_GENERATOR.name(),
                        email: global.USER_DATA_GENERATOR.email(),
                        password: global.USER_DATA_GENERATOR.password(),
                        role: 'editor'
                    });

                    const token = getSessionToken(editorUser.id);

                    await request(global.SERVER_APP)
                        .get(`${global.TASKS_PATH}`)
                        .query({ page: 1, limit: 3 })
                        .set('Authorization', `Bearer ${token}`)
                        .expect(expectedStatus);
                });
            });

            describe('User role is administrator', () => {
                test('should be able to access this feature (200 OK)', async () => {
                    const expectedStatus = 200;

                    // create an administrator user
                    const adminUser = await global.USER_MODEL.create({
                        name: global.USER_DATA_GENERATOR.name(),
                        email: global.USER_DATA_GENERATOR.email(),
                        password: global.USER_DATA_GENERATOR.password(),
                        role: 'admin'
                    });

                    const token = getSessionToken(adminUser.id);

                    await request(global.SERVER_APP)
                        .get(`${global.TASKS_PATH}`)
                        .query({ page: 1, limit: 3 })
                        .set('Authorization', `Bearer ${token}`)
                        .expect(expectedStatus);
                });
            });
        });

        describe('Page and limit not provided', () => {
            test('should not return an error (200 OK)', async () => {
                const expectedStatus = 200;

                // create a user
                const user = await global.USER_MODEL.create({
                    name: global.USER_DATA_GENERATOR.name(),
                    email: global.USER_DATA_GENERATOR.email(),
                    password: global.USER_DATA_GENERATOR.password(),
                    role: 'admin'
                });

                const token = getSessionToken(user.id);

                await request(global.SERVER_APP)
                    .get(`${global.TASKS_PATH}`)
                    .set('Authorization', `Bearer ${token}`)
                    // no query sent
                    .expect(expectedStatus);
            });
        });

        describe('Limit is less than 1', () => {
            test('should return status 400 BAD REQUEST', async () => {
                const expectedStatus = 400;

                // create a user
                const user = await global.USER_MODEL.create({
                    name: global.USER_DATA_GENERATOR.name(),
                    email: global.USER_DATA_GENERATOR.email(),
                    password: global.USER_DATA_GENERATOR.password(),
                    role: 'admin'
                });

                const token = getSessionToken(user.id);
                // 0 or -1
                const invalidLimit = -(Math.round(Math.random()));

                const response = await request(global.SERVER_APP)
                    .get(`${global.TASKS_PATH}`)
                    .query({ page: 1, limit: invalidLimit })
                    .set('Authorization', `Bearer ${token}`)
                    .expect(expectedStatus);

                expect(response.status).toBe(expectedStatus);
                expect(response.body.error).toBe('Limit must be a valid number');
            });
        });

        describe('Limit is greater than 100', () => {
            test('should return status 400 BAD REQUEST', async () => {
                const expectedStatus = 400;

                // create a user
                const user = await global.USER_MODEL.create({
                    name: global.USER_DATA_GENERATOR.name(),
                    email: global.USER_DATA_GENERATOR.email(),
                    password: global.USER_DATA_GENERATOR.password(),
                    role: 'admin'
                });

                const token = getSessionToken(user.id);
                const invalidLimit = 101;

                const response = await request(global.SERVER_APP)
                    .get(`${global.TASKS_PATH}`)
                    .query({ page: 1, limit: invalidLimit })
                    .set('Authorization', `Bearer ${token}`);

                expect(response.status).toBe(expectedStatus);
                expect(response.body.error).toBe('Limit is too large');
            });
        });

        describe('Page is less than 1', () => {
            test('should return status 400 BAD REQUEST', async () => {
                const expectedStatus = 400;

                // create a user
                const user = await global.USER_MODEL.create({
                    name: global.USER_DATA_GENERATOR.name(),
                    email: global.USER_DATA_GENERATOR.email(),
                    password: global.USER_DATA_GENERATOR.password(),
                    role: 'admin'
                });

                const token = getSessionToken(user.id);
                const invalidPage = -(Math.round(Math.random()));

                const response = await request(global.SERVER_APP)
                    .get(`${global.TASKS_PATH}`)
                    .query({ page: invalidPage, limit: 1 })
                    .set('Authorization', `Bearer ${token}`);                    

                expect(response.status).toBe(expectedStatus);
                expect(response.body.error).toBe('Page must be a valid number');
            });
        });

        describe('Response to client', () => {
            describe('At least 5 tasks in database', () => {
                describe('Providing page 1 and limit 5', () => {
                    test('should return 5 tasks', async () => {
                        const expectedLength = 5;

                        // create a user
                        const user = await global.USER_MODEL.create({
                            name: global.USER_DATA_GENERATOR.name(),
                            email: global.USER_DATA_GENERATOR.email(),
                            password: global.USER_DATA_GENERATOR.password(),
                            role: 'admin'
                        });

                        // create 5 tasks
                        for (let i = 0; i < 5; i++) {
                            await global.TASKS_MODEL.create({
                                name: global.TASKS_DATA_GENERATOR.name(),
                                description: global.TASKS_DATA_GENERATOR.description(),
                                status: global.TASKS_DATA_GENERATOR.status(),
                                priority: global.TASKS_DATA_GENERATOR.priority(),
                                user: user.id
                            });
                        }

                        const token = getSessionToken(user.id);
                        const page = 1;
                        const limit = 5;

                        const tasksFound = await request(global.SERVER_APP)
                            .get(`${global.TASKS_PATH}`)
                            .query({ page, limit })
                            .set('Authorization', `Bearer ${token}`)
                            .expect(tasksSuccessfullyFoundStatus);

                        expect(tasksFound.body).toHaveLength(expectedLength);
                        tasksFound.body.forEach((task: any) => {
                            expect(task).toStrictEqual({
                                name: expect.any(String),
                                description: expect.any(String),
                                status: expect.any(String),
                                priority: expect.any(String),
                                user: expect.any(String),
                                createdAt: expect.any(String),
                                updatedAt: expect.any(String),
                                id: expect.any(String),
                            });
                        });
                    });
                });

                describe('Providing page 2 and limit 2', () => {
                    test('should return 2 tasks', async () => {
                        const expectedLength = 2;

                        // create a user
                        const user = await global.USER_MODEL.create({
                            name: global.USER_DATA_GENERATOR.name(),
                            email: global.USER_DATA_GENERATOR.email(),
                            password: global.USER_DATA_GENERATOR.password(),
                            role: 'admin'
                        });

                        // create 5 tasks
                        for (let i = 0; i < 5; i++) {
                            await global.TASKS_MODEL.create({
                                name: global.TASKS_DATA_GENERATOR.name(),
                                description: global.TASKS_DATA_GENERATOR.description(),
                                status: global.TASKS_DATA_GENERATOR.status(),
                                priority: global.TASKS_DATA_GENERATOR.priority(),
                                user: user.id
                            });
                        }

                        const token = getSessionToken(user.id);
                        const page = 2;
                        const limit = 2;

                        const tasksFound = await request(global.SERVER_APP)
                            .get(`${global.TASKS_PATH}`)
                            .query({ page, limit })
                            .set('Authorization', `Bearer ${token}`)
                            .expect(tasksSuccessfullyFoundStatus);

                        expect(tasksFound.body).toHaveLength(expectedLength);
                        tasksFound.body.forEach((task: any) => {
                            expect(task).toStrictEqual({
                                name: expect.any(String),
                                description: expect.any(String),
                                status: expect.any(String),
                                priority: expect.any(String),
                                user: expect.any(String),
                                createdAt: expect.any(String),
                                updatedAt: expect.any(String),
                                id: expect.any(String),
                            });
                        });
                    });
                });
            });
        });
    });
});