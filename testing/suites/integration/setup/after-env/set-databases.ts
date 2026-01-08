import { faker } from '@faker-js/faker/.';
import { testKit } from '@integration/kit/test.kit';
import { mock } from 'jest-mock-extended';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import * as nodemailer from 'nodemailer';
import { NodemailerMock } from 'nodemailer-mock';
import { MongoDatabase } from 'src/databases/mongo.database';
import { RedisDatabase } from 'src/databases/redis.database';
import { LoggerService } from 'src/services/logger.service';
import { RedisService } from 'src/services/redis.service';
import { SystemLoggerService } from 'src/services/system-logger.service';

beforeEach(() => {
    const { mock: nodemailerMock } = nodemailer as unknown as NodemailerMock;
    nodemailerMock.reset(); // reset mock before each test
});

let mongoMemoryServer: MongoMemoryReplSet;
let mongoDatabase: MongoDatabase;
let redisDatabase: RedisDatabase;

async function cleanup() {
    await Promise.all([redisDatabase.disconnect(), mongoDatabase.disconnect()]);
    await mongoMemoryServer.stop({ doCleanup: true, force: true });
}

beforeAll(async () => {
    try {
        // Disable logs.
        jest.spyOn(SystemLoggerService, 'info').mockImplementation();
        testKit.loggerServiceMock = mock<LoggerService>();

        // MongoDB (in-memory).
        mongoMemoryServer = await MongoMemoryReplSet.create({
            instanceOpts: [{ port: 27017 + Math.floor(Math.random() * 1000) }],
        }); // 1 node replica set by default
        const mongoUri = mongoMemoryServer.getUri();
        mongoDatabase = new MongoDatabase(testKit.loggerServiceMock, {
            listenModelEvents: false,
            listenConnectionEvents: false,
            mongoUri,
        });

        // Redis (in-memory) with "ioredis-mock" url is not needed.
        const redisUri = faker.internet.url();
        redisDatabase = new RedisDatabase({
            listenToConnectionEvents: false,
            redisUri,
        });

        // Connect
        const [, redisClient] = await Promise.all([
            mongoDatabase.connect(),
            redisDatabase.connect(),
        ]);
        testKit.redisService = new RedisService(redisClient);

        // Environment
        process.env.MONGO_URI = mongoUri;
        process.env.REDIS_URI = redisUri;
    } catch (error) {
        console.error(error);
        await cleanup();
        process.exit(1);
    }
});

afterAll(async () => {
    await cleanup();
});
