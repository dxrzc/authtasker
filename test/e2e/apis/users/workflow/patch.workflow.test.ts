import axios, { Axios, AxiosError } from "axios";
import * as dataGenerator from "../../../helpers/generators/user-info.generator";
import { handleAxiosError } from "../../../helpers/handlers/axios-error.handler";

describe('Users - PATCH/ Workflow', () => {
    describe('An updated user', () => {
        test('data must be updated when user is found', async () => {
            try {
                // create user            
                const created = await axios.post(global.REGISTER_USER_PATH, {
                    name: dataGenerator.name(),
                    email: dataGenerator.email(),
                    password: dataGenerator.password()
                });

                const userId = created.data.user.id;
                const userToken = created.data.token

                // update
                const userNewData = {
                    name: dataGenerator.name(),
                    email: dataGenerator.email(),
                };

                await axios.patch(`${global.USERS_PATH}/${userId}`,
                    userNewData, {
                    headers: {
                        Authorization: `Bearer ${userToken}`
                    }
                });

                // find by id
                const response = await axios.get(`${global.USERS_PATH}/${userId}`, {
                    headers: {
                        Authorization: `Bearer ${userToken}`
                    }
                });

                expect(response.data).toMatchObject({
                    name: userNewData.name.toLowerCase(),
                    email: userNewData.email,
                });

            } catch (error) {
                handleAxiosError(error);
            }
        });

        test('can login with new data (200 OK)', async () => {
            try {
                const expectedStatus = 200;

                // create user            
                const created = await axios.post(global.REGISTER_USER_PATH, {
                    name: dataGenerator.name(),
                    email: dataGenerator.email(),
                    password: dataGenerator.password()
                });

                const userId = created.data.user.id;
                const userToken = created.data.token

                // update
                const userNewData = {
                    name: dataGenerator.name(),
                    email: dataGenerator.email(),
                    password: dataGenerator.password(),
                };

                await axios.patch(`${global.USERS_PATH}/${userId}`,
                    userNewData, {
                    headers: {
                        Authorization: `Bearer ${userToken}`
                    }
                });

                // login
                const response = await axios.post(global.LOGIN_USER_PATH, {
                    email: userNewData.email,
                    password: userNewData.password
                });

                expect(response.status).toBe(expectedStatus);

            } catch (error) {
                handleAxiosError(error);
            }
        });
    });
});