import request from 'supertest';
import { testKit } from './testKit.util';
import { status2xx } from './status2xx.util';
import { UserRole } from '@root/types/user/user-roles.type';

export const createUser = async (role: UserRole) => {
    const userData = testKit.userDataGenerator.fullUser();
    const response = await request(testKit.server)
        .post(testKit.endpoints.register)
        .send(userData)
        .expect(status2xx);

    const refreshToken = response.body.refreshToken;
    const sessionToken = response.body.sessionToken;
    const userId = response.body.user.id;
    const userEmail = response.body.user.email;
    const userName = response.body.user.name;

    if (role != 'readonly')
        await testKit.userModel.findByIdAndUpdate(userId, { role, emailValidated: true });

    return {
        refreshToken,
        sessionToken,
        userId,
        userEmail,
        userName,
        unhashedPassword: userData.password
    };
};