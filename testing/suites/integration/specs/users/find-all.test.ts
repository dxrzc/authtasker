import { testKit } from '@integration/kit/test.kit';
import { createUser } from '@integration/utils/create-user.util';
import { status2xx } from '@integration/utils/status-2xx.util';
import { getRandomRole } from '@test/tools/utilities/get-random-role.util';
import { UserRole } from 'src/enums/user-role.enum';
import { authErrors } from 'src/messages/auth.error.messages';
import { paginationErrors } from 'src/messages/pagination.error.messages';
import { UserDocument } from 'src/types/user/user-document.type';

describe(`GET ${testKit.urls.usersAPI}?limit=...&page=...`, () => {
    describe('Session cookie not provided', () => {
        test('return 401 status code and invalid token error message', async () => {
            const response = await testKit.agent.get(
                `${testKit.urls.usersAPI}?limit=${1}&page=${1}`,
            );
            expect(response.body).toStrictEqual({ error: authErrors.INVALID_TOKEN });
            expect(response.status).toBe(401);
        });
    });

    describe('Page beyond available data', () => {
        test('return 200 status code with empty data array when requesting page beyond available users', async () => {
            // Create some users
            await createUser(UserRole.EDITOR);
            await createUser(UserRole.EDITOR);
            await createUser(UserRole.EDITOR);
            const { sessionToken } = await createUser(UserRole.READONLY);
            const totalUsers = await testKit.models.user.countDocuments().exec();
            // Request page far beyond available data
            const response = await testKit.agent
                .get(`${testKit.urls.usersAPI}?limit=${2}&page=${100}`)
                .set('Authorization', `Bearer ${sessionToken}`)
                .expect(status2xx);
            expect(response.body.data).toStrictEqual([]);
            expect(response.body.totalDocuments).toBe(totalUsers);
        });
    });

    describe('Limit is not number', () => {
        test('return 400 status code and invalid limit error message', async () => {
            const invalidLimit = 'A12####';
            const { sessionToken } = await createUser(getRandomRole());
            const response = await testKit.agent
                .get(`${testKit.urls.usersAPI}?limit=${invalidLimit}&page=${1}`)
                .set('Authorization', `Bearer ${sessionToken}`);
            expect(response.body).toStrictEqual({ error: paginationErrors.INVALID_LIMIT });
            expect(response.status).toBe(400);
        });
    });

    describe('Page is not a number', () => {
        test('return 400 status code and invalid page error message', async () => {
            const invalidPage = 'A12####';
            const { sessionToken } = await createUser(getRandomRole());
            const response = await testKit.agent
                .get(`${testKit.urls.usersAPI}?limit=${1}&page=${invalidPage}`)
                .set('Authorization', `Bearer ${sessionToken}`);
            expect(response.body).toStrictEqual({ error: paginationErrors.INVALID_PAGE });
            expect(response.status).toBe(400);
        });
    });

    describe('Several users created', () => {
        test('data in pagination should work correctly and returning all users sorted by createdAt and _id', async () => {
            // create several users
            for (let i = 0; i < 5; i++) {
                await createUser(getRandomRole());
            }
            const { sessionToken } = await createUser(UserRole.READONLY);
            const allUsersFinal = await testKit.models.user.find().exec();
            const expectedUsersFinal = allUsersFinal
                .sort((a, b) => {
                    if (a.createdAt.getTime() === b.createdAt.getTime())
                        return a._id.toString().localeCompare(b._id.toString());
                    return a.createdAt.getTime() - b.createdAt.getTime();
                })
                .map((u: UserDocument) => ({
                    ...u.toJSON(),
                    createdAt: u.createdAt.toISOString(),
                    updatedAt: u.updatedAt.toISOString(),
                    id: u._id.toString(),
                }));

            const nUsersFinal = allUsersFinal.length;
            // Half of the users in page 1
            const res1 = await testKit.agent
                .get(`${testKit.urls.usersAPI}?limit=${Math.ceil(nUsersFinal / 2)}&page=${1}`)
                .set('Authorization', `Bearer ${sessionToken}`)
                .expect(status2xx);
            const res1Ids = res1.body.data.map((u: any) => u.id);
            const expectedIds1 = expectedUsersFinal
                .slice(0, Math.ceil(nUsersFinal / 2))
                .map((u) => u.id);
            expect(res1Ids).toStrictEqual(expectedIds1);
            // Other half of the users in page 2
            const res2 = await testKit.agent
                .get(`${testKit.urls.usersAPI}?limit=${Math.ceil(nUsersFinal / 2)}&page=${2}`)
                .set('Authorization', `Bearer ${sessionToken}`)
                .expect(status2xx);
            const res2Ids = res2.body.data.map((u: any) => u.id);
            const expectedIds2 = expectedUsersFinal
                .slice(Math.ceil(nUsersFinal / 2), nUsersFinal)
                .map((u) => u.id);
            expect(res2Ids).toStrictEqual(expectedIds2);
        });

        test('cache all the users returned in page', async () => {
            const { sessionToken } = await createUser(UserRole.READONLY);
            // Create some users to ensure we have enough
            await createUser(getRandomRole());
            await createUser(getRandomRole());
            const limit = 2;
            const response = await testKit.agent
                .get(`${testKit.urls.usersAPI}?limit=${limit}&page=${1}`)
                .set('Authorization', `Bearer ${sessionToken}`)
                .expect(status2xx);
            const usersInResponseId = response.body.data.map((u: UserDocument) => u.id);
            expect(usersInResponseId.length).toBeGreaterThan(0);
            await Promise.all(
                usersInResponseId.map(async (userId: string) => {
                    const inCache = await testKit.usersCacheService.get(userId);
                    expect(inCache).not.toBeNull();
                }),
            );
        });

        test('total documents should be the total number of users', async () => {
            const { sessionToken } = await createUser(UserRole.READONLY);
            const allUsers = await testKit.models.user.countDocuments().exec();
            const response = await testKit.agent
                .get(`${testKit.urls.usersAPI}?limit=${2}&page=${1}`)
                .set('Authorization', `Bearer ${sessionToken}`);
            expect(response.body.totalDocuments).toBe(allUsers);
        });

        describe('One of the users is already in cache', () => {
            test('return the data in cache for the user', async () => {
                const { id } = await createUser(getRandomRole());
                const user = await testKit.models.user.findById(id);
                if (!user) throw new Error('User not found');
                // change something to be able to notice if comes from cache
                user.name = 'This name indicates that the user came from cache';
                await testKit.usersCacheService.cache(user);
                const { sessionToken } = await createUser(UserRole.READONLY);
                const response = await testKit.agent
                    .get(`${testKit.urls.usersAPI}?limit=${100}&page=${1}`) // Large limit to ensure we get our user
                    .set('Authorization', `Bearer ${sessionToken}`)
                    .expect(status2xx);
                const userFromResponse = response.body.data.find(
                    (u: UserDocument) => u.id === user._id.toString(),
                );
                expect(userFromResponse.name).toBe(
                    'This name indicates that the user came from cache',
                );
            });
        });

        test('total pages should be the number of users divided by the provided limit', async () => {
            const { sessionToken } = await createUser(UserRole.READONLY);
            const nUsers = await testKit.models.user.countDocuments().exec();
            const limit = 2;
            const response = await testKit.agent
                .get(`${testKit.urls.usersAPI}?limit=${limit}&page=${1}`)
                .set('Authorization', `Bearer ${sessionToken}`);
            const expectedTotalPages = Math.ceil(nUsers / limit);
            expect(response.body.totalPages).toBe(expectedTotalPages);
        });
    });
});
