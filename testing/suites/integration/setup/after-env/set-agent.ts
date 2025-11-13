import { faker } from '@faker-js/faker/.';
import { testKit } from '@integration/kit/test.kit';
import request from 'supertest';

beforeAll(() => {
    Object.defineProperty(testKit, 'agent', {
        get: () => {
            const client = request(testKit.server);
            const field = 'X-Forwarded-For';
            return {
                get: (url: string) => client.get(url).set(field, faker.internet.ip()),
                post: (url: string) => client.post(url).set(field, faker.internet.ip()),
                put: (url: string) => client.put(url).set(field, faker.internet.ip()),
                delete: (url: string) => client.delete(url).set(field, faker.internet.ip()),
                patch: (url: string) => client.patch(url).set(field, faker.internet.ip()),
            };
        },
    });
});
