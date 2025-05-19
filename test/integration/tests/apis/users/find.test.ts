import request from 'supertest'
import { getSessionToken } from '../../helpers/token/session.token';

describe('GET/', () => {
    describe('Find many by pagination', () => {
        const usersSuccessfullyFoundStatus = 200;

        describe('Authentication/Authorization', () => {
            describe('Token is not provided', () => {
                test('should not be able to access this feature (401 UNAUTHORIZED)', async () => {
                    const expectedStatus = 401;

                    const response = await request(global.SERVER_APP)
                        .get(`${global.USERS_PATH}`)
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
                        .get(`${global.USERS_PATH}`)
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
                        .get(`${global.USERS_PATH}`)
                        .query({ page: 1, limit: 3 })
                        .set('Authorization', `Bearer ${token}`)
                        .expect(expectedStatus);
                });
            });

            describe('User role is administrator', () => {
                test('should be able to access this feature (200 OK)', async () => {
                    const expectedStatus = 200;

                    // create a admin user
                    const adminUser = await global.USER_MODEL.create({
                        name: global.USER_DATA_GENERATOR.name(),
                        email: global.USER_DATA_GENERATOR.email(),
                        password: global.USER_DATA_GENERATOR.password(),
                        role: 'admin'
                    });

                    const token = getSessionToken(adminUser.id);

                    await request(global.SERVER_APP)
                        .get(`${global.USERS_PATH}`)
                        .query({ page: 1, limit: 3 })
                        .set('Authorization', `Bearer ${token}`)
                        .expect(expectedStatus);
                });
            });
        });

        describe('Page and limit not provided', () => {
            test('should not return an error (200 OK)', async () => {
                const expectedStatus = 200;

                // create a user in order to use their id to generate a token                
                const userInDb = await global.USER_MODEL.create({
                    name: global.USER_DATA_GENERATOR.name(),
                    email: global.USER_DATA_GENERATOR.email(),
                    password: await global.HASHING_SERVICE.hash(global.USER_DATA_GENERATOR.password()),
                });

                const token = getSessionToken(userInDb.id);

                await request(global.SERVER_APP)
                    .get(`${global.USERS_PATH}`)
                    // queries not sent
                    .set('Authorization', `Bearer ${token}`)
                    .expect(expectedStatus);
            });
        });

        describe('limit is greater than 100', () => {
            test('should return status 400 BAD REQUEST', async () => {
                const expectedStatus = 400;

                // create a user in order to use their id to generate a token                
                const userInDb = await global.USER_MODEL.create({
                    name: global.USER_DATA_GENERATOR.name(),
                    email: global.USER_DATA_GENERATOR.email(),
                    password: await global.HASHING_SERVICE.hash(global.USER_DATA_GENERATOR.password()),
                });

                const token = getSessionToken(userInDb.id);

                const invalidLimit = 101;

                const response = await request(global.SERVER_APP)
                    .get(`${global.USERS_PATH}`)
                    .query({ limit: invalidLimit })
                    .set('Authorization', `Bearer ${token}`);

                expect(response.status).toBe(expectedStatus);
                expect(response.body.error).toBe('Limit is too large');
            });
        });

        describe('limit is less than 1', () => {
            test('should return status 400 BAD REQUEST', async () => {
                const expectedStatus = 400;

                // create a user in order to use their id to generate a token                
                const userInDb = await global.USER_MODEL.create({
                    name: global.USER_DATA_GENERATOR.name(),
                    email: global.USER_DATA_GENERATOR.email(),
                    password: await global.HASHING_SERVICE.hash(global.USER_DATA_GENERATOR.password()),
                });

                const token = getSessionToken(userInDb.id);

                // sometimes 0, sometimes -1
                const invalidLimit = -(Math.round(Math.random()));

                const response = await request(global.SERVER_APP)
                    .get(`${global.USERS_PATH}`)
                    .query({ limit: invalidLimit })
                    .set('Authorization', `Bearer ${token}`);

                expect(response.status).toBe(expectedStatus);
                expect(response.body.error).toBe('Limit must be a valid number');
            });
        });

        describe('page is less than 1', () => {
            test('should return status 400 BAD REQUEST', async () => {
                const expectedStatus = 400;

                // create a user in order to use their id to generate a token                
                const userInDb = await global.USER_MODEL.create({
                    name: global.USER_DATA_GENERATOR.name(),
                    email: global.USER_DATA_GENERATOR.email(),
                    password: await global.HASHING_SERVICE.hash(global.USER_DATA_GENERATOR.password()),
                });

                const token = getSessionToken(userInDb.id);

                // sometimes 0, sometimes -1
                const invalidPage = -(Math.round(Math.random()));

                const response = await request(global.SERVER_APP)
                    .get(`${global.USERS_PATH}`)
                    .query({ page: invalidPage })
                    .set('Authorization', `Bearer ${token}`);

                expect(response.status).toBe(expectedStatus);
                expect(response.body.error).toBe('Page must be a valid number');
            });
        });

        describe('Response to client', () => {
            describe('At least 5 users in database', () => {
                describe('Providing page 1 and limit 5', () => {
                    test('should return 5 users', async () => {
                        const expectedLength = 5;
                        let userId = '';

                        // create 5 users
                        for (let i = 0; i < 5; i++) {
                            const userCreated = await global.USER_MODEL.create({
                                name: global.USER_DATA_GENERATOR.name(),
                                email: global.USER_DATA_GENERATOR.email(),
                                password: global.USER_DATA_GENERATOR.password(),
                                role: 'editor'
                            });
                            userId = userCreated.id;
                        }

                        // get a session token
                        const token = getSessionToken(userId);

                        const page = 1;
                        const limit = 5;

                        const usersFound = await request(global.SERVER_APP)
                            .get(`${global.USERS_PATH}`)
                            .query({ page, limit })
                            .set('Authorization', `Bearer ${token}`)
                            .expect(usersSuccessfullyFoundStatus);

                        expect(usersFound.body).toHaveLength(expectedLength);
                        usersFound.body.forEach((task: any) => {
                            expect(task).toStrictEqual({
                                name: expect.any(String),
                                email: expect.any(String),
                                role: expect.any(String),
                                emailValidated: expect.any(Boolean),
                                createdAt: expect.any(String),
                                updatedAt: expect.any(String),
                                id: expect.any(String),
                            });
                        });
                    });
                });

                describe('Providing page 2 and limit 2', () => {
                    test('should return 2 users', async () => {
                        const expectedLength = 2;
                        let userId = '';

                        // create 5 users
                        for (let i = 0; i < 5; i++) {
                            const userCreated = await global.USER_MODEL.create({
                                name: global.USER_DATA_GENERATOR.name(),
                                email: global.USER_DATA_GENERATOR.email(),
                                password: global.USER_DATA_GENERATOR.password(),
                                role: 'editor'
                            });
                            userId = userCreated.id;
                        }

                        // get a session token
                        const token = getSessionToken(userId);

                        const page = 2;
                        const limit = 2;

                        const usersFound = await request(global.SERVER_APP)
                            .get(`${global.USERS_PATH}`)
                            .query({ page, limit })
                            .set('Authorization', `Bearer ${token}`)
                            .expect(usersSuccessfullyFoundStatus);

                        expect(usersFound.body).toHaveLength(expectedLength);
                        usersFound.body.forEach((task: any) => {
                            expect(task).toStrictEqual({
                                name: expect.any(String),
                                email: expect.any(String),
                                role: expect.any(String),
                                emailValidated: expect.any(Boolean),
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