import Redis from 'ioredis';
import { ConfigService, RedisService } from '@root/services';

jest.mock('ioredis');
const MockRedis = Redis as jest.MockedClass<typeof Redis>;

describe('RedisService', () => {
    let redisService: RedisService;
    let redisMock: jest.Mocked<Redis>;
    const configService = {
        REDIS_PORT: 6379,
        REDIS_HOST: 'localhost',
        REDIS_PASSWORD: 'secret',
        NODE_ENV: 'test',
    } as ConfigService;

    beforeEach(() => {
        MockRedis.mockClear();
        redisMock = {
            status: 'ready',
            connect: jest.fn(),
            quit: jest.fn(),
            set: jest.fn(),
            get: jest.fn(),
            del: jest.fn(),
            on: jest.fn(),
        } as any;

        MockRedis.mockImplementation(() => redisMock);
        redisService = new RedisService(configService);
        // Replace actual redis with mock manually
        (redisService as any).redis = redisMock;
    });

    describe('connect', () => {
        it('connects if redis status is not "ready"', async () => {
            redisMock.status = 'connecting';
            await redisService.connect();
            expect(redisMock.connect).toHaveBeenCalledTimes(1);
        });

        it('does not connect if redis status is "ready"', async () => {
            redisMock.status = 'ready';
            await redisService.connect();
            expect(redisMock.connect).not.toHaveBeenCalled();
        });
    });

    describe('disconnect', () => {
        it('disconnects if redis status is "ready"', async () => {
            redisMock.status = 'ready';
            await redisService.disconnect();
            expect(redisMock.quit).toHaveBeenCalledTimes(1);
        });

        it('does not disconnect if redis status is not "ready"', async () => {
            redisMock.status = 'connecting';
            await redisService.disconnect();
            expect(redisMock.quit).not.toHaveBeenCalled();
        });
    });

    describe('set', () => {
        it('stores a string value without expiration', async () => {
            await redisService.set('myKey', 'hello');
            expect(redisMock.set).toHaveBeenCalledWith('myKey', 'hello');
        });

        it('stores an object value as JSON', async () => {
            await redisService.set('objKey', { foo: 'bar' });
            expect(redisMock.set).toHaveBeenCalledWith('objKey', JSON.stringify({ foo: 'bar' }));
        });

        it('sets with expiration time', async () => {
            await redisService.set('expKey', 'value', 120);
            expect(redisMock.set).toHaveBeenCalledWith('expKey', 'value', 'EX', 120);
        });
    });

    describe('get', () => {
        it('parses a valid JSON string', async () => {
            redisMock.get.mockResolvedValue('{"foo":"bar"}');
            const result = await redisService.get<{ foo: string }>('key');
            expect(result).toEqual({ foo: 'bar' });
        });

        it('returns raw string if not valid JSON', async () => {
            redisMock.get.mockResolvedValue('not-json');
            const result = await redisService.get<string>('key');
            expect(result).toBe('not-json');
        });

        it('returns null if key is not found', async () => {
            redisMock.get.mockResolvedValue(null);
            const result = await redisService.get('nonexistent');
            expect(result).toBeNull();
        });
    });

    describe('delete', () => {
        it('deletes a key', async () => {
            await redisService.delete('deleteKey');
            expect(redisMock.del).toHaveBeenCalledWith('deleteKey');
        });
    });

    describe('listenConnectionEvents', () => {
        it('registers connection event listeners', () => {
            redisService.listenConnectionEvents();
            expect(redisMock.on).toHaveBeenCalledWith('connect', expect.any(Function));
            expect(redisMock.on).toHaveBeenCalledWith('end', expect.any(Function));
            expect(redisMock.on).toHaveBeenCalledWith('error', expect.any(Function));
        });
    });
});
