import request from 'supertest';
import { jwtService } from '../../helpers/token/jwt-service';

describe('POST/', () => {
    describe('Login', () => {
        test('should successfully log in a user (200 OK)', async () => {
            // create user using model
            const user = {
                name: global.USER_DATA_GENERATOR.name(),
                email: global.USER_DATA_GENERATOR.email(),
                password: global.USER_DATA_GENERATOR.password(),
            };

            const hashedPassword = await global.HASHING_SERVICE.hash(user.password);

            await global.USER_MODEL.create({
                ...user,
                password: hashedPassword,
            });

            // login
            const expectedStatus = 200;
            await request(global.SERVER_APP)
                .post(global.LOGIN_USER_PATH)
                .send({
                    email: user.email,
                    password: user.password,
                })
                .expect(expectedStatus);
        });

        describe('Response to client', () => {
            test('should not contain password', async () => {
                // create user using model
                const user = {
                    name: global.USER_DATA_GENERATOR.name(),
                    email: global.USER_DATA_GENERATOR.email(),
                    password: global.USER_DATA_GENERATOR.password(),
                };

                const hashedPassword = await global.HASHING_SERVICE.hash(user.password);
                await global.USER_MODEL.create({
                    ...user,
                    password: hashedPassword,
                });

                // login
                const response = await request(global.SERVER_APP)
                    .post(global.LOGIN_USER_PATH)
                    .send({
                        email: user.email,
                        password: user.password,
                    })
                    .expect(200);

                expect(response.body.user.password)
                    .not
                    .toBeDefined();
            });

            test('should contain a token generated with user id', async () => {
                // create user using model
                const user = {
                    name: global.USER_DATA_GENERATOR.name(),
                    email: global.USER_DATA_GENERATOR.email(),
                    password: global.USER_DATA_GENERATOR.password(),
                };

                const hashedPassword = await global.HASHING_SERVICE.hash(user.password);
                const userInDb = await global.USER_MODEL.create({
                    ...user,
                    password: hashedPassword,
                });

                // login
                const response = await request(global.SERVER_APP)
                    .post(global.LOGIN_USER_PATH)
                    .send({
                        email: user.email,
                        password: user.password,
                    })
                    .expect(200);

                const tokenInResponse = response.body.token;

                // get token's payload
                const payload = jwtService.verify<{ id: string }>(tokenInResponse);

                expect(payload?.id).toBe(userInDb.id);
            });

            test('should contain the same data as db', async () => {
                // create user using model
                const user = {
                    name: global.USER_DATA_GENERATOR.name(),
                    email: global.USER_DATA_GENERATOR.email(),
                    password: global.USER_DATA_GENERATOR.password(),
                };

                const hashedPassword = await global.HASHING_SERVICE.hash(user.password);
                const userInDb = await global.USER_MODEL.create({
                    ...user,
                    password: hashedPassword,
                });

                // login
                const response = await request(global.SERVER_APP)
                    .post(global.LOGIN_USER_PATH)
                    .send({
                        email: user.email,
                        password: user.password,
                    })
                    .expect(200);

                expect(response.body).toStrictEqual({
                    token: expect.any(String),
                    user: {
                        name: userInDb?.name,
                        email: userInDb?.email,
                        role: userInDb?.role,
                        emailValidated: userInDb?.emailValidated,
                        createdAt: userInDb?.createdAt.toISOString(),
                        updatedAt: userInDb?.updatedAt.toISOString(),
                        id: userInDb?.id,
                    }
                });
            });
        });

        describe('Client request', () => {
            test('a missing property causes 400 BAD REQUEST', async () => {
                const expectedStatus = 400;

                const response = await request(global.SERVER_APP)
                    .post(global.LOGIN_USER_PATH)
                    .send({
                        email: global.USER_DATA_GENERATOR.email(),
                        // no password sent
                    });
                    
                expect(response.status).toBe(expectedStatus);
                expect(response.body.error).toBe('password should not be null or undefined');
            });
        });
    });
});