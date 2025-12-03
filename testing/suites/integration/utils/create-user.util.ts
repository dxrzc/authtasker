import { testKit } from '@integration/kit/test.kit';
import { UserRole } from 'src/enums/user-role.enum';
import { status2xx } from './status-2xx.util';

export async function createUser(userRole: UserRole = UserRole.READONLY) {
    const userData = testKit.userData.user;
    const { body } = await testKit.agent
        .post(testKit.urls.register)
        .send(userData)
        .expect(status2xx);

    const userId = body.user.id;
    if (userRole != UserRole.READONLY) {
        await testKit.models.user.findByIdAndUpdate(userId, {
            role: userRole,
            emailValidated: true,
        });
    }
    return {
        refreshToken: body.refreshToken,
        sessionToken: body.sessionToken,
        email: body.user.email,
        name: body.user.name,
        unhashedPassword: userData.password,
        id: userId,
    };
}
