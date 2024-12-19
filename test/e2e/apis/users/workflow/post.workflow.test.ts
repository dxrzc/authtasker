import axios from "axios";
import { handleAxiosError } from "../../../helpers/handlers/axios-error.handler";

describe('Users - POST/ Workflow', () => {
    describe('Create user', () => {
        test('response should contain token and user data (no password)', async () => {
            try {
                const created = await axios.post(global.REGISTER_USER_PATH, {
                    name: global.DATA_GENERATOR.name(),
                    email: global.DATA_GENERATOR.email(),
                    password: global.DATA_GENERATOR.password()
                });

                expect(created.data).toStrictEqual({
                    token: expect.any(String),
                    user: {
                        name: expect.any(String),
                        email: expect.any(String),
                        createdAt: expect.any(String),
                        updatedAt: expect.any(String),
                        emailValidated: expect.any(Boolean),
                        id: expect.any(String),
                        role: expect.any(String)
                    }
                });

            } catch (error) {
                handleAxiosError(error);
            }
        });
    });

    describe('Login User', () => {
        test('created user can login and get token and data (no password)', async () => {
            try {
                const userData = {
                    name: global.DATA_GENERATOR.name(),
                    email: global.DATA_GENERATOR.email(),
                    password: global.DATA_GENERATOR.password()
                };

                // create
                await axios.post(
                    global.REGISTER_USER_PATH,
                    userData
                );

                // login
                const loggedIn = await axios.post(global.LOGIN_USER_PATH, {
                    email: userData.email,
                    password: userData.password
                });

                expect(loggedIn.data).toStrictEqual({
                    token: expect.any(String),
                    user: {
                        name: userData.name.toLowerCase(),
                        email: userData.email,
                        createdAt: expect.any(String),
                        updatedAt: expect.any(String),
                        emailValidated: expect.any(Boolean),
                        id: expect.any(String),
                        role: expect.any(String)
                    }
                });

            } catch (error) {
                handleAxiosError(error);
            }
        });
    });
});