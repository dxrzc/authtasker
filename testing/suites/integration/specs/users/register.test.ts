import { testKit } from '@integration/kit/test.kit';

describe('POST /api/auth/register', () => {
    test('hola', async () => {
        const res = await testKit.agent.post(testKit.urls.register).send({
            name: 'John Doe',
            email: 'john.doe@example.com',
            password: 'password123',
        });
        console.log(res.statusCode);
        console.log(res.body);
    });
});
