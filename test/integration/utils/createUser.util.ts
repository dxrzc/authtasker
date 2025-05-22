import request from 'supertest';
import { UserRole } from '@root/types/user';
import { testKit } from './testKit.util';

export const createUser = async (role: UserRole) => {
    const response = await request(testKit.server)
        .post(testKit.endpoints.register)
        .send(testKit.userDataGenerator.fullUser());

    const sessionToken = response.body.token;
    const userId = response.body.user.id;
    const userEmail = response.body.user.email;

    if (role != 'readonly')
        await testKit.userModel.findByIdAndUpdate(userId, { role, emailValidated: true });

    return {
        sessionToken,
        userId,
        userEmail
    };
};