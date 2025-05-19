import request from 'supertest'
import { Types } from "mongoose";
import { getSessionToken } from '../../helpers/token/session.token';
import { FORBIDDEN_MESSAGE } from '@root/rules/errors/messages/error.messages';

describe('PATCH/', () => {
    describe('Update user', () => {
        describe('Authentication/Authorization', () => {
            describe('No token provided', () => {
                test('should causes 401 UNAUTHORIZED', async () => {
                    // generate a valid mongo id
                    const id = new Types.ObjectId();
                    const expectedStatus = 401;

                    const response = await request(global.SERVER_APP)
                        .patch(`${global.USERS_PATH}/${id}`)
                        .send({ name: '...' });

                    expect(response.status).toBe(expectedStatus);
                    expect(response.body.error).toBe('No token provided');
                });
            });

            describe('User role is readonly', () => {
                test('should be able to update their own account (200 OK)', async () => {
                    const expectedStatus = 200;

                    // create a readonly user
                    const readonlyUser = await global.USER_MODEL.create({
                        name: global.USER_DATA_GENERATOR.name(),
                        email: global.USER_DATA_GENERATOR.email(),
                        password: await global.HASHING_SERVICE.hash(global.USER_DATA_GENERATOR.password()),
                        role: 'readonly',
                    });

                    const readonlyUserId = readonlyUser.id;
                    const readonlyToken = getSessionToken(readonlyUserId);

                    await request(global.SERVER_APP)
                        .patch(`${global.USERS_PATH}/${readonlyUserId}`)
                        .send({ name: global.USER_DATA_GENERATOR.name() })
                        .set('Authorization', `Bearer ${readonlyToken}`)
                        .expect(expectedStatus);
                });

                test('should not be able to update another readonly (403 FORBIDDEN)', async () => {
                    const expectedStatus = 403;

                    // create a readonly user
                    const readonlyUser = await global.USER_MODEL.create({
                        name: global.USER_DATA_GENERATOR.name(),
                        email: global.USER_DATA_GENERATOR.email(),
                        password: await global.HASHING_SERVICE.hash(global.USER_DATA_GENERATOR.password()),
                        role: 'readonly',
                    });

                    const readonlyToken = getSessionToken(readonlyUser.id);

                    // create another readonly user
                    const anotherReadonlyUser = await global.USER_MODEL.create({
                        name: global.USER_DATA_GENERATOR.name(),
                        email: global.USER_DATA_GENERATOR.email(),
                        password: await global.HASHING_SERVICE.hash(global.USER_DATA_GENERATOR.password()),
                        role: 'readonly',
                    });

                    const anotherReadonlyUserId = anotherReadonlyUser.id;

                    const response = await request(global.SERVER_APP)
                        .patch(`${global.USERS_PATH}/${anotherReadonlyUserId}`)
                        .send({ name: global.USER_DATA_GENERATOR.name() })
                        .set('Authorization', `Bearer ${readonlyToken}`);

                    expect(response.status).toBe(expectedStatus);
                    expect(response.body.error).toBe(FORBIDDEN_MESSAGE);
                });

                test('should not be able to update an editor user (403 FORBIDDEN)', async () => {
                    const expectedStatus = 403;

                    // create a readonly user
                    const readonlyUser = await global.USER_MODEL.create({
                        name: global.USER_DATA_GENERATOR.name(),
                        email: global.USER_DATA_GENERATOR.email(),
                        password: await global.HASHING_SERVICE.hash(global.USER_DATA_GENERATOR.password()),
                        role: 'readonly',
                    });

                    const readonlyToken = getSessionToken(readonlyUser.id);

                    // create an editor user
                    const editorUser = await global.USER_MODEL.create({
                        name: global.USER_DATA_GENERATOR.name(),
                        email: global.USER_DATA_GENERATOR.email(),
                        password: await global.HASHING_SERVICE.hash(global.USER_DATA_GENERATOR.password()),
                        role: 'editor',
                    });

                    const editorUserId = editorUser.id;

                    const response = await request(global.SERVER_APP)
                        .patch(`${global.USERS_PATH}/${editorUserId}`)
                        .send({ name: global.USER_DATA_GENERATOR.name() })
                        .set('Authorization', `Bearer ${readonlyToken}`);

                    expect(response.status).toBe(expectedStatus);
                    expect(response.body.error).toBe(FORBIDDEN_MESSAGE);
                });

                test('should not be able to update an administrator (403 FORBIDDEN)', async () => {
                    const expectedStatus = 403;

                    // create a readonly user
                    const readonlyUser = await global.USER_MODEL.create({
                        name: global.USER_DATA_GENERATOR.name(),
                        email: global.USER_DATA_GENERATOR.email(),
                        password: await global.HASHING_SERVICE.hash(global.USER_DATA_GENERATOR.password()),
                        role: 'readonly',
                    });

                    const readonlyToken = getSessionToken(readonlyUser.id);

                    // create an administrator user
                    const adminUser = await global.USER_MODEL.create({
                        name: global.USER_DATA_GENERATOR.name(),
                        email: global.USER_DATA_GENERATOR.email(),
                        password: await global.HASHING_SERVICE.hash(global.USER_DATA_GENERATOR.password()),
                        role: 'admin',
                    });

                    const adminUserId = adminUser.id;

                    const response = await request(global.SERVER_APP)
                        .patch(`${global.USERS_PATH}/${adminUserId}`)
                        .send({ name: global.USER_DATA_GENERATOR.name() })
                        .set('Authorization', `Bearer ${readonlyToken}`);
                        
                    expect(response.status).toBe(expectedStatus);
                    expect(response.body.error).toBe(FORBIDDEN_MESSAGE);
                });
            });

            describe('User role is editor', () => {
                test('should be able to update their own account (200 OK)', async () => {
                    const expectedStatus = 200;

                    // create an editor user
                    const editorUser = await global.USER_MODEL.create({
                        name: global.USER_DATA_GENERATOR.name(),
                        email: global.USER_DATA_GENERATOR.email(),
                        password: await global.HASHING_SERVICE.hash(global.USER_DATA_GENERATOR.password()),
                        role: 'editor',
                    });

                    const editorUserId = editorUser.id;
                    const editorToken = getSessionToken(editorUserId);

                    await request(global.SERVER_APP)
                        .patch(`${global.USERS_PATH}/${editorUserId}`)
                        .send({ name: global.USER_DATA_GENERATOR.name() })
                        .set('Authorization', `Bearer ${editorToken}`)
                        .expect(expectedStatus);
                });

                test('should not be able to update another editor user (403 FORBIDDEN)', async () => {
                    const expectedStatus = 403;

                    // create an editor user
                    const editorUser = await global.USER_MODEL.create({
                        name: global.USER_DATA_GENERATOR.name(),
                        email: global.USER_DATA_GENERATOR.email(),
                        password: await global.HASHING_SERVICE.hash(global.USER_DATA_GENERATOR.password()),
                        role: 'editor',
                    });

                    const editorToken = getSessionToken(editorUser.id);

                    // create another editor user
                    const anotherEditorUser = await global.USER_MODEL.create({
                        name: global.USER_DATA_GENERATOR.name(),
                        email: global.USER_DATA_GENERATOR.email(),
                        password: await global.HASHING_SERVICE.hash(global.USER_DATA_GENERATOR.password()),
                        role: 'editor',
                    });

                    const anotherEditorUserId = anotherEditorUser.id;

                    const response = await request(global.SERVER_APP)
                        .patch(`${global.USERS_PATH}/${anotherEditorUserId}`)
                        .send({ name: global.USER_DATA_GENERATOR.name() })
                        .set('Authorization', `Bearer ${editorToken}`)                        

                    expect(response.status).toBe(expectedStatus);
                    expect(response.body.error).toBe(FORBIDDEN_MESSAGE);
                });

                test('should not be able to update a readonly user (403 FORBIDDEN)', async () => {
                    const expectedStatus = 403;

                    // create an editor user
                    const editorUser = await global.USER_MODEL.create({
                        name: global.USER_DATA_GENERATOR.name(),
                        email: global.USER_DATA_GENERATOR.email(),
                        password: await global.HASHING_SERVICE.hash(global.USER_DATA_GENERATOR.password()),
                        role: 'editor',
                    });

                    const editorToken = getSessionToken(editorUser.id);

                    // create a readonly user
                    const readonlyUser = await global.USER_MODEL.create({
                        name: global.USER_DATA_GENERATOR.name(),
                        email: global.USER_DATA_GENERATOR.email(),
                        password: await global.HASHING_SERVICE.hash(global.USER_DATA_GENERATOR.password()),
                        role: 'readonly',
                    });

                    const readonlyUserId = readonlyUser.id;

                    const response = await request(global.SERVER_APP)
                        .patch(`${global.USERS_PATH}/${readonlyUserId}`)
                        .send({ name: global.USER_DATA_GENERATOR.name() })
                        .set('Authorization', `Bearer ${editorToken}`);
                        
                    expect(response.status).toBe(expectedStatus);
                    expect(response.body.error).toBe(FORBIDDEN_MESSAGE);
                });

                test('should not be able to update an administrator (403 FORBIDDEN)', async () => {
                    const expectedStatus = 403;

                    // create an editor user
                    const editorUser = await global.USER_MODEL.create({
                        name: global.USER_DATA_GENERATOR.name(),
                        email: global.USER_DATA_GENERATOR.email(),
                        password: await global.HASHING_SERVICE.hash(global.USER_DATA_GENERATOR.password()),
                        role: 'editor',
                    });

                    const editorToken = getSessionToken(editorUser.id);

                    // create an administrator user
                    const adminUser = await global.USER_MODEL.create({
                        name: global.USER_DATA_GENERATOR.name(),
                        email: global.USER_DATA_GENERATOR.email(),
                        password: await global.HASHING_SERVICE.hash(global.USER_DATA_GENERATOR.password()),
                        role: 'admin',
                    });

                    const adminUserId = adminUser.id;

                    const response = await request(global.SERVER_APP)
                        .patch(`${global.USERS_PATH}/${adminUserId}`)
                        .send({ name: global.USER_DATA_GENERATOR.name() })
                        .set('Authorization', `Bearer ${editorToken}`);
                        
                    expect(response.status).toBe(expectedStatus);
                    expect(response.body.error).toBe(FORBIDDEN_MESSAGE);
                });
            });

            describe('User role is administrator', () => {
                test('should be able to update a readonly user (200 OK)', async () => {
                    const expectedStatus = 200;

                    // create an administrator user
                    const adminUser = await global.USER_MODEL.create({
                        name: global.USER_DATA_GENERATOR.name(),
                        email: global.USER_DATA_GENERATOR.email(),
                        password: await global.HASHING_SERVICE.hash(global.USER_DATA_GENERATOR.password()),
                        role: 'admin',
                    });

                    const adminToken = getSessionToken(adminUser.id);

                    // create a readonly user
                    const readonlyUser = await global.USER_MODEL.create({
                        name: global.USER_DATA_GENERATOR.name(),
                        email: global.USER_DATA_GENERATOR.email(),
                        password: await global.HASHING_SERVICE.hash(global.USER_DATA_GENERATOR.password()),
                        role: 'readonly',
                    });

                    const readonlyUserId = readonlyUser.id;

                    await request(global.SERVER_APP)
                        .patch(`${global.USERS_PATH}/${readonlyUserId}`)
                        .send({ name: global.USER_DATA_GENERATOR.name() })
                        .set('Authorization', `Bearer ${adminToken}`)
                        .expect(expectedStatus);
                });

                test('should be able to update an editor user (200 OK)', async () => {
                    const expectedStatus = 200;

                    // create an administrator user
                    const adminUser = await global.USER_MODEL.create({
                        name: global.USER_DATA_GENERATOR.name(),
                        email: global.USER_DATA_GENERATOR.email(),
                        password: await global.HASHING_SERVICE.hash(global.USER_DATA_GENERATOR.password()),
                        role: 'admin',
                    });

                    const adminToken = getSessionToken(adminUser.id);

                    // create an editor user
                    const editorUser = await global.USER_MODEL.create({
                        name: global.USER_DATA_GENERATOR.name(),
                        email: global.USER_DATA_GENERATOR.email(),
                        password: await global.HASHING_SERVICE.hash(global.USER_DATA_GENERATOR.password()),
                        role: 'editor',
                    });

                    const editorUserId = editorUser.id;

                    await request(global.SERVER_APP)
                        .patch(`${global.USERS_PATH}/${editorUserId}`)
                        .send({ name: global.USER_DATA_GENERATOR.name() })
                        .set('Authorization', `Bearer ${adminToken}`)
                        .expect(expectedStatus);
                });

                test('should be able to update their own account (200 OK)', async () => {
                    const expectedStatus = 200;

                    // create an administrator user
                    const adminUser = await global.USER_MODEL.create({
                        name: global.USER_DATA_GENERATOR.name(),
                        email: global.USER_DATA_GENERATOR.email(),
                        password: await global.HASHING_SERVICE.hash(global.USER_DATA_GENERATOR.password()),
                        role: 'admin',
                    });

                    const adminUserId = adminUser.id;
                    const adminToken = getSessionToken(adminUserId);

                    await request(global.SERVER_APP)
                        .patch(`${global.USERS_PATH}/${adminUserId}`)
                        .send({ name: global.USER_DATA_GENERATOR.name() })
                        .set('Authorization', `Bearer ${adminToken}`)
                        .expect(expectedStatus);
                });

                test('should not be able to update another administrator (403 FORBIDDEN)', async () => {
                    const expectedStatus = 403;

                    // create an administrator user
                    const adminUser = await global.USER_MODEL.create({
                        name: global.USER_DATA_GENERATOR.name(),
                        email: global.USER_DATA_GENERATOR.email(),
                        password: await global.HASHING_SERVICE.hash(global.USER_DATA_GENERATOR.password()),
                        role: 'admin',
                    });

                    const adminToken = getSessionToken(adminUser.id);

                    // create another administrator user
                    const anotherAdminUser = await global.USER_MODEL.create({
                        name: global.USER_DATA_GENERATOR.name(),
                        email: global.USER_DATA_GENERATOR.email(),
                        password: await global.HASHING_SERVICE.hash(global.USER_DATA_GENERATOR.password()),
                        role: 'admin',
                    });

                    const anotherAdminUserId = anotherAdminUser.id;

                    const response = await request(global.SERVER_APP)
                        .patch(`${global.USERS_PATH}/${anotherAdminUserId}`)
                        .send({ name: global.USER_DATA_GENERATOR.name() })
                        .set('Authorization', `Bearer ${adminToken}`);
                        
                    expect(response.status).toBe(expectedStatus);
                    expect(response.body.error).toBe(FORBIDDEN_MESSAGE);
                });
            });
        });

        describe('Name already exists', () => {
            test('should return 400 BAD REQUEST', async () => {
                const expectedStatus = 400;

                // create two users
                const previousUser = await global.USER_MODEL.create({
                    name: global.USER_DATA_GENERATOR.name(),
                    email: global.USER_DATA_GENERATOR.email(),
                    password: await global.HASHING_SERVICE
                        .hash(global.USER_DATA_GENERATOR.password()),
                });

                const newUser = await global.USER_MODEL.create({
                    name: global.USER_DATA_GENERATOR.name(),
                    email: global.USER_DATA_GENERATOR.email(),
                    password: await global.HASHING_SERVICE
                        .hash(global.USER_DATA_GENERATOR.password()),
                });

                // generate a session token for the new user
                const validToken = getSessionToken(newUser.id);

                // update newUser name 
                const response = await request(global.SERVER_APP)
                    .patch(`${global.USERS_PATH}/${newUser.id}`)
                    .send({ name: previousUser.name })
                    .set('Authorization', `Bearer ${validToken}`);
                    
                expect(response.status).toBe(expectedStatus);
                expect(response.body.error).toBe(`User with name "${previousUser.name}" already exists`);
            });
        });

        describe('Email already exists', () => {
            test('should return 400 BAD REQUEST', async () => {
                const expectedStatus = 400;

                // create two users
                const previousUser = await global.USER_MODEL.create({
                    name: global.USER_DATA_GENERATOR.name(),
                    email: global.USER_DATA_GENERATOR.email(),
                    password: await global.HASHING_SERVICE
                        .hash(global.USER_DATA_GENERATOR.password()),
                });

                const newUser = await global.USER_MODEL.create({
                    name: global.USER_DATA_GENERATOR.name(),
                    email: global.USER_DATA_GENERATOR.email(),
                    password: await global.HASHING_SERVICE
                        .hash(global.USER_DATA_GENERATOR.password()),
                });

                // generate a session token for the new user
                const validToken = getSessionToken(newUser.id);

                // update newUser email 
                const response = await request(global.SERVER_APP)
                    .patch(`${global.USERS_PATH}/${newUser.id}`)
                    .send({ email: previousUser.email })
                    .set('Authorization', `Bearer ${validToken}`);
                    
                expect(response.status).toBe(expectedStatus);
                expect(response.body.error).toBe(`User with email "${previousUser.email}" already exists`);
            });
        });

        describe('User is not found', () => {
            test('should return status 404 NOT FOUND', async () => {
                const expectedStatus = 404;

                // create user in order to set bearer token
                const userInDb = await global.USER_MODEL.create({
                    name: global.USER_DATA_GENERATOR.name(),
                    email: global.USER_DATA_GENERATOR.email(),
                    password: await global.HASHING_SERVICE.hash(global.USER_DATA_GENERATOR.password()),
                });

                // generate a token with user id
                const validToken = getSessionToken(userInDb.id);

                const validMongoId = new Types.ObjectId();

                const response = await request(global.SERVER_APP)
                    .patch(`${global.USERS_PATH}/${validMongoId}`)
                    .send({ name: global.USER_DATA_GENERATOR.name() })
                    .set('Authorization', `Bearer ${validToken}`);
                    
                expect(response.status).toBe(expectedStatus);
                expect(response.body.error).toBe(`User with id ${validMongoId} not found`);
            });
        });

        describe('Id is not valid', () => {
            test('should return status 404 NOT FOUND', async () => {
                const expectedStatus = 404;

                // create user in order to set bearer token
                const userInDb = await global.USER_MODEL.create({
                    name: global.USER_DATA_GENERATOR.name(),
                    email: global.USER_DATA_GENERATOR.email(),
                    password: await global.HASHING_SERVICE.hash(global.USER_DATA_GENERATOR.password()),
                });

                // generate a token with user id
                const validToken = getSessionToken(userInDb.id);

                const invalidMongoId = 123;

                const response = await request(global.SERVER_APP)
                    .patch(`${global.USERS_PATH}/${invalidMongoId}`)
                    // at least one property is required
                    .send({ name: global.USER_DATA_GENERATOR.name() })
                    .set('Authorization', `Bearer ${validToken}`);                    

                expect(response.status).toBe(expectedStatus);
                expect(response.body.error).toBe(`User with id ${invalidMongoId} not found`);
            });
        });

        describe('No new property is provided', () => {
            test('should causes 400 BAD REQUEST', async () => {
                const expectedStatus = 400;

                // create user
                const userInDb = await global.USER_MODEL.create({
                    name: global.USER_DATA_GENERATOR.name(),
                    email: global.USER_DATA_GENERATOR.email(),
                    password: await global.HASHING_SERVICE.hash(global.USER_DATA_GENERATOR.password()),
                });

                // generate a token with user id
                const validToken = getSessionToken(userInDb.id);

                const response = await request(global.SERVER_APP)
                    .patch(`${global.USERS_PATH}/${userInDb.id}`)
                    // no new properties sent                    
                    .set('Authorization', `Bearer ${validToken}`);                    

                expect(response.status).toBe(expectedStatus);
                expect(response.body.error).toBe('At least one field is required to update the user');
            });
        });

        // ensures that validation class is applied
        describe('Password is not valid', () => {
            test('should causes 400 BAD REQUEST', async () => {
                const expectedStatus = 400;

                // create user
                const userInDb = await global.USER_MODEL.create({
                    name: global.USER_DATA_GENERATOR.name(),
                    email: global.USER_DATA_GENERATOR.email(),
                    password: await global.HASHING_SERVICE.hash(global.USER_DATA_GENERATOR.password()),
                });

                // generate a token with user id
                const validToken = getSessionToken(userInDb.id);

                const response = await request(global.SERVER_APP)
                    .patch(`${global.USERS_PATH}/${userInDb.id}`)
                    .send({ password: '12' }) // length not valid
                    .set('Authorization', `Bearer ${validToken}`)
                    .expect(expectedStatus);

                expect((response.body.error as string).includes('password'))
                    .toBeTruthy();
            });
        });

        describe('Name is updated', () => {
            test('should be transformed to lowercase', async () => {
                // create user
                const userInDb = await global.USER_MODEL.create({
                    name: global.USER_DATA_GENERATOR.name(),
                    email: global.USER_DATA_GENERATOR.email(),
                    password: await global.HASHING_SERVICE.hash(global.USER_DATA_GENERATOR.password()),
                });

                // name is transformed to lowercase
                const newName = global.USER_DATA_GENERATOR.name();
                const expectedNameInDatabase = newName.toLowerCase();

                // generate a token with user id
                const validToken = getSessionToken(userInDb.id);

                // update
                await request(global.SERVER_APP)
                    .patch(`${global.USERS_PATH}/${userInDb.id}`)
                    .send({ name: newName })
                    .set('Authorization', `Bearer ${validToken}`)
                    .expect(200);

                // find user in database
                const userUpdatedInDb = await global.USER_MODEL
                    .findById(userInDb.id)
                    .exec();

                expect(userUpdatedInDb?.name).toBe(expectedNameInDatabase);
            });
        });

        describe('Password is updated', () => {
            test('should be hashed', async () => {
                // create user
                const userInDb = await global.USER_MODEL.create({
                    name: global.USER_DATA_GENERATOR.name(),
                    email: global.USER_DATA_GENERATOR.email(),
                    password: await global.HASHING_SERVICE.hash(global.USER_DATA_GENERATOR.password()),
                });

                const newPassword = global.USER_DATA_GENERATOR.password();

                // generate a token with user id
                const validToken = getSessionToken(userInDb.id);

                // update
                await request(global.SERVER_APP)
                    .patch(`${global.USERS_PATH}/${userInDb.id}`)
                    .send({ password: newPassword })
                    .set('Authorization', `Bearer ${validToken}`)
                    .expect(200);

                // find user in database
                const userUpdatedInDb = await global.USER_MODEL
                    .findById(userInDb.id)
                    .exec();

                const samePassword = global.HASHING_SERVICE.compare(
                    newPassword,
                    userUpdatedInDb!.password
                );
                expect(samePassword).toBeTruthy();
            });
        });

        describe('Email is updated', () => {
            test('email should be successfully updated', async () => {
                // create user and set emailValidated to true
                const userInDb = await global.USER_MODEL.create({
                    name: global.USER_DATA_GENERATOR.name(),
                    email: global.USER_DATA_GENERATOR.email(),
                    password: await global.HASHING_SERVICE.hash(global.USER_DATA_GENERATOR.password()),
                });

                const newEmail = global.USER_DATA_GENERATOR.email();

                // generate a token with user id
                const validToken = getSessionToken(userInDb.id);

                // update
                await request(global.SERVER_APP)
                    .patch(`${global.USERS_PATH}/${userInDb.id}`)
                    .send({ email: newEmail })
                    .set('Authorization', `Bearer ${validToken}`)
                    .expect(200);

                // find user in database
                const userUpdatedInDb = await global.USER_MODEL
                    .findById(userInDb.id)
                    .exec();

                expect(userUpdatedInDb?.email).toBe(newEmail);
            });

            describe('email is different', () => {
                describe('email is validated (role is editor)', () => {
                    test('should be updated to false and role updated to "readonly"', async () => {
                        // create user and set emailValidated to true
                        const userInDb = await global.USER_MODEL.create({
                            name: global.USER_DATA_GENERATOR.name(),
                            email: global.USER_DATA_GENERATOR.email(),
                            password: await global.HASHING_SERVICE.hash(global.USER_DATA_GENERATOR.password()),
                        });
                        userInDb.emailValidated = true;
                        userInDb.role = 'editor';
                        await userInDb.save();

                        const newEmail = global.USER_DATA_GENERATOR.email();

                        // generate a token with user id
                        const validToken = getSessionToken(userInDb.id);

                        // update
                        await request(global.SERVER_APP)
                            .patch(`${global.USERS_PATH}/${userInDb.id}`)
                            .send({ email: newEmail })
                            .set('Authorization', `Bearer ${validToken}`)
                            .expect(200);

                        // find user in database
                        const userUpdatedInDb = await global.USER_MODEL
                            .findById(userInDb.id)
                            .exec();

                        expect(userUpdatedInDb?.emailValidated).toBeFalsy();
                        expect(userUpdatedInDb?.role).toBe('readonly');
                    });
                });
            });

            describe('email is the same', () => {
                describe('email is validated (role is editor)', () => {
                    test('emailValidated should remain as true and role as editor', async () => {
                        // create user and set emailValidated to true
                        const userInDb = await global.USER_MODEL.create({
                            name: global.USER_DATA_GENERATOR.name(),
                            email: global.USER_DATA_GENERATOR.email(),
                            password: await global.HASHING_SERVICE.hash(global.USER_DATA_GENERATOR.password()),
                        });
                        userInDb.emailValidated = true;
                        userInDb.role = 'editor';
                        await userInDb.save();

                        // generate a token with user id
                        const validToken = getSessionToken(userInDb.id);

                        // update
                        await request(global.SERVER_APP)
                            .patch(`${global.USERS_PATH}/${userInDb.id}`)
                            // send the same email
                            .send({ email: userInDb.email })
                            .set('Authorization', `Bearer ${validToken}`)
                            .expect(200);

                        // find user in database
                        const userUpdatedInDb = await global.USER_MODEL
                            .findById(userInDb.id)
                            .exec();

                        expect(userUpdatedInDb?.emailValidated).toBeTruthy();
                        expect(userUpdatedInDb?.role).toBe('editor');
                    });
                });
            });
        });
    });
});