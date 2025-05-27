import request from 'supertest';
import { createUser, status2xx, testKit } from '@integration/utils';
import { PAGINATION_SETTINGS } from '@root/rules/constants';

describe('GET /api/users/:id', () => {
    // Creating an extra user to get a valid token breaks the tests
    let randomUserSessionToken: string;
    let usersIdSorted = new Array<string>();

    // Assuming pagination is sorted by name
    beforeAll(async () => {
        const maxUsers = 15;
        let promises = new Array<ReturnType<typeof createUser>>();
        for (let i = 0; i < maxUsers; i++)
            promises.push(createUser('readonly'));

        const sortedUsers = (await Promise.all(promises))
            .sort((userA, userB) => {
                if (userA.userName == userB.userName) return 0;
                if (userA.userName > userB.userName) return 1;
                return -1;
            });

        randomUserSessionToken = sortedUsers[0].sessionToken;
        usersIdSorted = sortedUsers.map((obj) => obj.userId);
    });

    describe('Page and limit not provided', () => {
        test('use the default page and limit', async () => {
            const defaultPage = PAGINATION_SETTINGS.DEFAULT_PAGE;
            const defaultLimit = PAGINATION_SETTINGS.DEFAULT_LIMIT;

            const response = await request(testKit.server)
                .get(testKit.endpoints.usersAPI)
                .set('Authorization', `Bearer ${randomUserSessionToken}`)
                .expect(status2xx);

            expect(response.body.length).toBe(defaultLimit);
            expect(response.body[0].id).toBe(usersIdSorted[defaultLimit * (defaultPage - 1)]);
        });
    });

    describe('Response - Success', () => {
        test('return the expected users with the expected and correct data (200 OK)', async () => {
            const expectedStatus = 200;

            const page = 3;
            const limit = 2;

            const response = await request(testKit.server)
                .get(testKit.endpoints.usersAPI)
                .query({ page, limit })
                .set('Authorization', `Bearer ${randomUserSessionToken}`);

            expect(response.body).toBeInstanceOf(Array);
            expect(response.body.length).toBe(limit);

            // compare every user
            const initialIndex = limit * (page - 1);
            let currentIndexInBody = 0;
            for (let i = initialIndex; i < initialIndex + limit; i++) {
                const userInDb = await testKit.userModel.findById(usersIdSorted[i]);
                expect(userInDb).not.toBeNull();

                const userInBody = response.body[currentIndexInBody++];
                expect(userInBody).toBeDefined();

                expect(userInBody).toStrictEqual({
                    name: userInDb!.name,
                    email: userInDb!.email,
                    role: userInDb!.role,
                    emailValidated: userInDb!.emailValidated,
                    createdAt: userInDb!.createdAt.toISOString(),
                    updatedAt: userInDb!.updatedAt.toISOString(),
                    id: userInDb!.id,
                });
            }

            expect(response.statusCode).toBe(expectedStatus);
        });
    });

    describe('Response - Failure', () => {
        test('return status 400 BAD REQUEST when page exceeds the max possible page for the documents count', async () => {
            const expectedStatus = 400;
            const expectedErrorMssg = 'Invalid page';

            const documentsCount = await testKit.userModel.countDocuments();
            const limit = 10;
            const invalidPage = Math.ceil(documentsCount / limit) + 1;

            const response = await request(testKit.server)
                .get(testKit.endpoints.usersAPI)
                .query({ page: invalidPage, limit })
                .set('Authorization', `Bearer ${randomUserSessionToken}`);

            expect(response.statusCode).toBe(expectedStatus);
            expect(response.body).toStrictEqual({ error: expectedErrorMssg });
        });
    });
});