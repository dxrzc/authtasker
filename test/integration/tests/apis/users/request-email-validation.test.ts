import request from "supertest";
import { getSessionToken } from "../../helpers/token/session.token";

describe('POST/', () => {
    describe('Request email validation', () => {
        describe('User email is already validated', () => {
            test('should return status 400 BAD REQUEST', async () => {
                const expectedStatus = 400;

                // create a user
                const user = await global.USER_MODEL.create({
                    name: global.USER_DATA_GENERATOR.name(),
                    email: global.USER_DATA_GENERATOR.email(),
                    password: await global.HASHING_SERVICE.hash(global.USER_DATA_GENERATOR.password()),
                });

                // change emailValidation to true
                user.emailValidated = true;
                await user.save();

                // generate a session token
                const userSessionToken = getSessionToken(user.id);

                // request email validation        
                const response = await request(global.SERVER_APP)
                    .post(`${global.USERS_PATH}/requestEmailValidation`)
                    .set('Authorization', `Bearer ${userSessionToken}`);

                expect(response.status).toBe(expectedStatus);
                expect(response.body.error).toBe('User email is already validated');
            });
        });
    });
});