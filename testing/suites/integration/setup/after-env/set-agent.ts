import { faker } from '@faker-js/faker/.';
import { testKit } from '@integration/kit/test.kit';
import request from 'supertest';

beforeAll(() => {
    Object.defineProperty(testKit, 'agent', {
        get: () => {
            const client = request(testKit.server);
            const field = 'X-Forwarded-For';
            const randomIp = faker.internet.ip();
            return {
                get: (url: string) => client.get(url).set(field, randomIp),
                post: (url: string) => client.post(url).set(field, randomIp),
                put: (url: string) => client.put(url).set(field, randomIp),
                delete: (url: string) => client.delete(url).set(field, randomIp),
            };
        },
    });
});
