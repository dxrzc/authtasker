import { testKit } from '@integration/kit/test.kit';
import { commonErrors } from 'src/messages/common.error.messages';

describe('Unhandled routes', () => {
    test('returns JSON 404 for unknown paths', async () => {
        const response = await testKit.agent.get('/api/unknown-route');
        expect(response.statusCode).toBe(404);
        expect(response.body).toStrictEqual({ error: commonErrors.NOT_FOUND });
    });
});
