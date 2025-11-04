import { testKit } from '@integration/utils/testKit.util';
import { CacheService } from 'src/services/cache.service';
import { UserResponse } from 'src/types/user/user-response.type';
import { makeUsersCacheKey } from 'src/common/logic/cache/make-users-cache-key';
import { DataInCache } from 'src/interfaces/cache/data-in-cache.interface';
import { UserDocument } from 'src/types/user/user-document.type';

const ttls = 10;
const hardTtls = 120;
let cacheService: CacheService<UserResponse>;

describe('CacheService', () => {
    beforeAll(() => {
        cacheService = new CacheService<UserResponse>(
            testKit.userModel,
            testKit.loggerServiceMock,
            testKit.redisService,
            ttls,
            hardTtls,
            makeUsersCacheKey,
        );
    });

    function compareWithUserInDb(value: object, userInDb: UserDocument) {
        expect(value).toStrictEqual({
            name: userInDb.name,
            email: userInDb.email,
            role: userInDb.role,
            emailValidated: userInDb.emailValidated,
            createdAt: userInDb.createdAt.toISOString(),
            updatedAt: userInDb.updatedAt.toISOString(),
            id: userInDb.id,
        });
    }

    describe('get', () => {
        describe('no data in cache', () => {
            test('return null', async () => {
                const unexistingId = '0000000';
                const result = await cacheService.get(unexistingId);
                expect(result).toBeNull();
            });
        });

        describe('data is found in cache', () => {
            describe('resource is not expired (hit)', () => {
                test('return the data in redis', async () => {
                    // cache the user data
                    const userInDb = await testKit.userModel.create(
                        testKit.userDataGenerator.fullUser(),
                    );
                    await cacheService.cache(userInDb);
                    // get the resource
                    const result = await cacheService.get(userInDb.id);
                    expect(result).toBeDefined();
                    compareWithUserInDb(result!, userInDb);
                });
            });

            describe('resource is expired', () => {
                describe('resource has changed (revalidate-miss)', () => {
                    test('return null', async () => {
                        // cache the user data
                        const userInDb = await testKit.userModel.create(
                            testKit.userDataGenerator.fullUser(),
                        );
                        await cacheService.cache(userInDb);
                        // we move to the time where it has already expired
                        jest.spyOn(Date, 'now').mockReturnValue(Date.now() + ttls * 1000 + 1000);
                        // apply some modification
                        await testKit.userModel.findByIdAndUpdate(userInDb, {
                            email: testKit.userDataGenerator.email,
                        });
                        // call get
                        const result = await cacheService.get(userInDb.id);
                        expect(result).toBeNull();
                    });
                });

                describe('resource has been deleted', () => {
                    test('return null', async () => {
                        // cache the user data
                        const userInDb = await testKit.userModel.create(
                            testKit.userDataGenerator.fullUser(),
                        );
                        await cacheService.cache(userInDb);
                        // we move to the time where it has already expired
                        jest.spyOn(Date, 'now').mockReturnValue(Date.now() + ttls * 1000 + 1000);
                        // delete the resource
                        await testKit.userModel.findByIdAndDelete(userInDb.id);
                        // call get
                        const result = await cacheService.get(userInDb.id);
                        expect(result).toBeNull();
                    });
                });

                describe('resource has not changed (revalidate-hit)', () => {
                    test('return the resource in cache', async () => {
                        // cache the user data
                        const userInDb = await testKit.userModel.create(
                            testKit.userDataGenerator.fullUser(),
                        );
                        await cacheService.cache(userInDb);
                        // we move to the time where it has already expired
                        jest.spyOn(Date, 'now').mockReturnValue(Date.now() + ttls * 1000 + 1000);
                        // call get
                        const result = await cacheService.get(userInDb.id);
                        compareWithUserInDb(result!, userInDb);
                    });
                });
            });
        });
    });

    describe('cache', () => {
        test('the provided data inside the "data" field', async () => {
            const userInDb = await testKit.userModel.create(testKit.userDataGenerator.fullUser());
            await cacheService.cache(userInDb);
            const dataInRedis = await testKit.redisService.get<DataInCache<UserResponse>>(
                makeUsersCacheKey(userInDb.id),
            );
            compareWithUserInDb(dataInRedis?.data, userInDb);
        });

        test('store the current time in unix in the "cacheAtUnix" field', async () => {
            // stabilize the test
            jest.spyOn(Date, 'now').mockReturnValue(Date.now());
            const currentUnixTime = Math.floor(Date.now() / 1000);
            const testUserId = '12345';
            await cacheService.cache({ id: testUserId } as any);
            const dataInRedis = await testKit.redisService.get<DataInCache<UserResponse>>(
                makeUsersCacheKey(testUserId),
            );
            expect(dataInRedis!.cachedAtUnix).toBe(currentUnixTime);
        });

        test('store the data with a max expiration time (hard-ttls)', async () => {
            const userInDb = await testKit.userModel.create(testKit.userDataGenerator.fullUser());
            await cacheService.cache(userInDb);
            const hardTtlsInRedis = await testKit.redisInstance.ttl(makeUsersCacheKey(userInDb.id));
            const margin = 1;
            expect(hardTtlsInRedis).toBeGreaterThanOrEqual(hardTtls - margin);
            expect(hardTtlsInRedis).toBeLessThanOrEqual(hardTtls + margin);
        });
    });
});
