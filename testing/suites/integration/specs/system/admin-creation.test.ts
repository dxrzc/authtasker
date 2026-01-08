import { testKit } from '@integration/kit/test.kit';
import { status2xx } from '@integration/utils/status-2xx.util';

describe('Admin creation', () => {
    test('Admin user is created on startup and can login successfully', async () => {
        await testKit.agent
            .post(testKit.urls.login)
            .send({
                password: testKit.configService.ADMIN_PASSWORD,
                email: testKit.configService.ADMIN_EMAIL,
            })
            .expect(status2xx);
    });
});
