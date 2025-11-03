import { RedisService } from 'src/services/redis.service';
import { mock } from 'jest-mock-extended';
import Redis from 'ioredis';

const redisMock = mock<Redis>();
const redisService = new RedisService(redisMock);

describe('RedisService', () => {
    describe('set', () => {
        describe('Provided data is an object', () => {
            test.concurrent('stringify before call "set" function', async () => {
                const myData = { user: 12345, email: 'test' };
                await redisService.set('test', myData);
                expect(redisMock.set).toHaveBeenCalledWith('test', JSON.stringify(myData));
            });
        });

        describe('Expiration time is provided', () => {
            test.concurrent('call "set" function with the provided expiration time', async () => {
                const expirationTime = 3600;
                await redisService.set('test', 'test-data', expirationTime);
                expect(redisMock.set).toHaveBeenCalledWith(
                    'test',
                    'test-data',
                    'EX',
                    expirationTime,
                );
            });
        });
    });

    describe('get', () => {
        describe('Data is an object', () => {
            test.concurrent('parse the data before return', async () => {
                const dataInRedis = { name: 'test_name' };
                redisMock.get.mockResolvedValueOnce(JSON.stringify(dataInRedis));
                const data = await redisService.get('test');
                expect(data).toStrictEqual(dataInRedis); // parsed
            });
        });

        describe('Data is just a string', () => {
            test.concurrent('return the string as-is', async () => {
                const dataInRedis = 'just a string';
                redisMock.get.mockResolvedValueOnce(dataInRedis);
                const data = await redisService.get('test');
                expect(data).toBe(dataInRedis);
            });
        });

        describe('function "get" returns null', () => {
            test.concurrent('return null', async () => {
                redisMock.get.mockResolvedValueOnce(null);
                const data = await redisService.get('test');
                expect(data).toBeNull();
            });
        });
    });

    describe('delete', () => {
        test.concurrent('call "del" function with the provided key', async () => {
            const key = 'test-key';
            await redisService.delete(key);
            expect(redisMock.del).toHaveBeenCalledWith(key);
        });
    });
});
