import { HashingService, JwtService } from '@root/services';
import request from 'supertest';
import { jwtService } from '../../helpers/token/jwt-service';

describe('POST/', () => {
    describe('Register', () => {
        test('should succesfully register a user (201 CREATED)', async () => {
            const expectedStatus = 201;
            const user = {
                name: global.USER_DATA_GENERATOR.name(),
                email: global.USER_DATA_GENERATOR.email(),
                password: global.USER_DATA_GENERATOR.password(),
            };

            // create user
            await request(global.SERVER_APP)
                .post(global.REGISTER_USER_PATH)
                .send(user)
                .expect(expectedStatus);
        });

        describe('Database', () => {
            test('name should be converted to lowercase', async () => {
                const user = {
                    name: global.USER_DATA_GENERATOR.name(),
                    email: global.USER_DATA_GENERATOR.email(),
                    password: global.USER_DATA_GENERATOR.password(),
                };

                // create user
                await request(global.SERVER_APP)
                    .post(global.REGISTER_USER_PATH)
                    .send(user)
                    .expect(201);

                const userInDb = await global.USER_MODEL
                    .findOne({ email: user.email })
                    .exec();

                expect(userInDb).toBeDefined();
                expect(userInDb?.name).toBe(user.name.toLowerCase());
            });

            test('password should be hashed', async () => {
                const user = {
                    name: global.USER_DATA_GENERATOR.name(),
                    email: global.USER_DATA_GENERATOR.email(),
                    password: global.USER_DATA_GENERATOR.password(),
                };

                // create user
                await request(global.SERVER_APP)
                    .post(global.REGISTER_USER_PATH)
                    .send(user)
                    .expect(201);

                // find user in db
                const userInDb = await global.USER_MODEL
                    .findOne({ email: user.email })
                    .exec();

                expect(userInDb).toBeDefined();

                // decrypt password using a hashing service
                const hashingService = new HashingService(global.CONFIG_SERVICE.BCRYPT_SALT_ROUNDS);
                const hashed = await hashingService.compare(user.password, userInDb!.password);

                expect(hashed).toBeTruthy();
            });

            test('email should be the provided one', async () => {
                const user = {
                    name: global.USER_DATA_GENERATOR.name(),
                    email: global.USER_DATA_GENERATOR.email(),
                    password: global.USER_DATA_GENERATOR.password(),
                };

                // create user
                await request(global.SERVER_APP)
                    .post(global.REGISTER_USER_PATH)
                    .send(user)
                    .expect(201);

                const userInDb = await global.USER_MODEL
                    .findOne({ email: user.email })
                    .exec();

                expect(userInDb?.email).toBe(user.email);
            });

            test('user should be readonly by default', async () => {
                const user = {
                    name: global.USER_DATA_GENERATOR.name(),
                    email: global.USER_DATA_GENERATOR.email(),
                    password: global.USER_DATA_GENERATOR.password(),
                };

                // create user
                await request(global.SERVER_APP)
                    .post(global.REGISTER_USER_PATH)
                    .send(user)
                    .expect(201);

                // find in db
                const userInDb = await USER_MODEL
                    .findOne({ email: user.email })
                    .exec();

                expect(userInDb).toBeDefined();
                expect(userInDb?.role).toBe('readonly');
            });

            test('emailValidated should be false by default', async () => {
                const user = {
                    name: global.USER_DATA_GENERATOR.name(),
                    email: global.USER_DATA_GENERATOR.email(),
                    password: global.USER_DATA_GENERATOR.password(),
                };

                // create user
                await request(global.SERVER_APP)
                    .post(global.REGISTER_USER_PATH)
                    .send(user)
                    .expect(201);

                // find in db
                const userDb = await USER_MODEL
                    .findOne({ email: user.email })
                    .exec();

                expect(userDb?.emailValidated).toBeFalsy();
            });

            test('createdAt and updatedAt properties should exist', async () => {
                const user = {
                    name: global.USER_DATA_GENERATOR.name(),
                    email: global.USER_DATA_GENERATOR.email(),
                    password: global.USER_DATA_GENERATOR.password(),
                };

                // create user
                await request(global.SERVER_APP)
                    .post(global.REGISTER_USER_PATH)
                    .send(user)
                    .expect(201);

                // find in db
                const userDb = await USER_MODEL
                    .findOne({ email: user.email })
                    .exec();

                expect(userDb).toBeDefined();
                expect(userDb?.createdAt).toBeDefined();
                expect(userDb?.updatedAt).toBeDefined();
            });
        });

        describe('Response to client', () => {
            test('should not contain password', async () => {
                const user = {
                    name: global.USER_DATA_GENERATOR.name(),
                    email: global.USER_DATA_GENERATOR.email(),
                    password: global.USER_DATA_GENERATOR.password(),
                };

                // create user
                const response = await request(global.SERVER_APP)
                    .post(global.REGISTER_USER_PATH)
                    .send(user)
                    .expect(201);

                expect(response.body.user.password)
                    .not
                    .toBeDefined();
            });

            test('should contain a token generated with user id', async () => {
                const user = {
                    name: global.USER_DATA_GENERATOR.name(),
                    email: global.USER_DATA_GENERATOR.email(),
                    password: global.USER_DATA_GENERATOR.password(),
                };

                // create user and get token
                const response = await request(global.SERVER_APP)
                    .post(global.REGISTER_USER_PATH)
                    .send(user)
                    .expect(201);

                const tokenInResponse = response.body.token;

                // get the user id directly from db
                const userInDb = await global.USER_MODEL
                    .findOne({ email: user.email })
                    .exec();

                const userId = userInDb?.id;

                // get token's payload
                const payload = jwtService.verify<{ id: string }>(tokenInResponse);

                // expect id in token is the same as the user id
                expect(payload?.id).toBe(userId);
            });

            test('should contain the same data as db', async () => {
                const user = {
                    name: global.USER_DATA_GENERATOR.name(),
                    email: global.USER_DATA_GENERATOR.email(),
                    password: global.USER_DATA_GENERATOR.password(),
                };

                // create user
                const response = await request(global.SERVER_APP)
                    .post(global.REGISTER_USER_PATH)
                    .send(user)
                    .expect(201);

                // find user in db
                const userInDb = await global.USER_MODEL
                    .findOne({ email: user.email })
                    .exec();

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

        describe('Client Request', () => {
            test('role can not be provided, 400 BAD REQUEST', async () => {
                const expectedStatus = 400;

                const user = {
                    name: global.USER_DATA_GENERATOR.name(),
                    email: global.USER_DATA_GENERATOR.email(),
                    password: global.USER_DATA_GENERATOR.password(),
                    role: 'admin'
                };

                const response = await request(global.SERVER_APP)
                    .post(global.REGISTER_USER_PATH)
                    .send(user);

                expect(response.status).toBe(expectedStatus);
                expect(response.body.error).toBe('property role should not exist');
            });

            test('a missing property causes 400 BAD REQUEST', async () => {
                const expectedStatus = 400;

                const user = {
                    name: global.USER_DATA_GENERATOR.name(),
                    password: global.USER_DATA_GENERATOR.password(),
                    // no email sent
                };

                // create user
                const response = await request(global.SERVER_APP)
                    .post(global.REGISTER_USER_PATH)
                    .send(user);

                expect(response.status).toBe(expectedStatus);
                expect(response.body.error).toBe('email should not be null or undefined');
            });

            test('already existing name causes 400 BAD REQUEST', async () => {
                const expectedStatus = 400;
                const name = global.USER_DATA_GENERATOR.name();

                const user1 = {
                    name,
                    email: global.USER_DATA_GENERATOR.email(),
                    password: global.USER_DATA_GENERATOR.password(),
                };

                const user2 = {
                    name,
                    email: global.USER_DATA_GENERATOR.email(),
                    password: global.USER_DATA_GENERATOR.password(),
                };

                // create user 1
                await request(global.SERVER_APP)
                    .post(global.REGISTER_USER_PATH)
                    .send(user1)
                    .expect(201);

                // create user 2
                const response = await request(global.SERVER_APP)
                    .post(global.REGISTER_USER_PATH)
                    .send(user2);

                expect(response.status).toBe(expectedStatus);
                expect(response.body.error).toBe(`User with name "${name}" already exists`);
            });
            
            test('already existing email causes 400 BAD REQUEST', async () => {
                const expectedStatus = 400;
                const email = global.USER_DATA_GENERATOR.email();

                const user1 = {
                    name: global.USER_DATA_GENERATOR.name(),
                    email,
                    password: global.USER_DATA_GENERATOR.password(),
                };

                const user2 = {
                    name: global.USER_DATA_GENERATOR.name(),
                    email,
                    password: global.USER_DATA_GENERATOR.password(),
                };

                // create user 1
                await request(global.SERVER_APP)
                    .post(global.REGISTER_USER_PATH)
                    .send(user1)
                    .expect(201);

                // create user 2
                const response = await request(global.SERVER_APP)
                    .post(global.REGISTER_USER_PATH)
                    .send(user2);

                expect(response.status).toBe(expectedStatus);
                expect(response.body.error).toBe(`User with email "${email}" already exists`);
            });
        });
    });
});