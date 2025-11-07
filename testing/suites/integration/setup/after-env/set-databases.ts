import { faker } from '@faker-js/faker/.';
import { testKit } from '@integration/kit/test.kit';
import { mock } from 'jest-mock-extended';
import { MongoMemoryServer } from 'mongodb-memory-server';
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

afterEach(async () => {
    // Clean up database collections between tests (only if models are initialized)
    if (testKit.models?.user?.db?.collections) {
        const collections = testKit.models.user.db.collections;
        await Promise.all(
            Object.values(collections).map((collection) => collection.deleteMany({})),
        );
    }

    // Clean up Redis keys between tests (only if redis service is initialized)
    if (testKit.redisService?.flushAll) {
        await testKit.redisService.flushAll();
    }
});

let mongoMemoryServer: MongoMemoryServer;
let mongoDatabase: MongoDatabase;
let redisDatabase: RedisDatabase;

async function cleanup() {
    try {
        // Disconnect databases first
        const disconnectPromises: Promise<void>[] = [];
        if (redisDatabase) {
            disconnectPromises.push(redisDatabase.disconnect());
        }
        if (mongoDatabase) {
            disconnectPromises.push(mongoDatabase.disconnect());
        }
        await Promise.all(disconnectPromises);

        // Stop mongo memory server
        if (mongoMemoryServer) {
            await mongoMemoryServer.stop();
        }
    } catch (error) {
        console.error('Error during cleanup:', error);
    }
}

beforeAll(async () => {
    try {
        // Disable logs.
        jest.spyOn(SystemLoggerService, 'info').mockImplementation();
        testKit.loggerServiceMock = mock<LoggerService>();

        // MongoDB (in-memory).
        mongoMemoryServer = await MongoMemoryServer.create();
        const mongoUri = mongoMemoryServer.getUri();
        mongoDatabase = new MongoDatabase(testKit.loggerServiceMock, {
            listenModelEvents: false,
            listenConnectionEvents: false,
            mongoUri,
        });

        // Redis (in-memory) with "ioredis-mock" url is not needed.
        const redisUri = faker.internet.url();
        redisDatabase = new RedisDatabase({
            listenConnectionEvents: false,
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
