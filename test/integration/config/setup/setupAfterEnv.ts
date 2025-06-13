import * as nodemailer from "nodemailer";
import { mock } from "jest-mock-extended";
import { NodemailerMock } from "nodemailer-mock";
import { AsyncLocalStorage } from "async_hooks";
import { Server } from '@root/server/server.init';
import { AppRoutes } from '@root/routes/server.routes';
import { JwtService } from '@root/services/jwt.service';
import { testKit } from '@integration/utils/testKit.util';
import { MongoMemoryServer } from "mongodb-memory-server";
import { RedisService } from '@root/services/redis.service';
import { LoggerService } from '@root/services/logger.service';
import { ConfigService } from '@root/services/config.service';
import { HashingService } from '@root/services/hashing.service';
import { MongoDatabase } from '@root/databases/mongo/mongo.database';
import { RedisDatabase } from '@root/databases/redis/redis.database';
import { IntegrationConfigService } from './types/config.service.type';
import { UserDataGenerator } from '@root/seed/generators/user.generator';
import { SystemLoggerService } from '@root/services/system-logger.service';
import { TasksDataGenerator } from '@root/seed/generators/tasks.generator';
import * as UserModelLoader from '@root/databases/mongo/models/user.model.load';
import * as TasksModelLoader from '@root/databases/mongo/models/tasks.model.load';
import { ErrorHandlerMiddleware } from '@root/middlewares/error-handler.middleware';

let mongoMemoryServer: MongoMemoryServer;
let mongoDatabase: MongoDatabase;
let redisDatabase: RedisDatabase;

// https://github.com/doublesharp/nodemailer-mock?tab=readme-ov-file#example-using-jest
const { mock: nodemailerMock } = nodemailer as unknown as NodemailerMock;
beforeEach(() => {
    // Reset nodemailer emails
    nodemailerMock.reset();
});

beforeAll(async () => {
    // disable info and warning logs
    jest.spyOn(SystemLoggerService, 'info').mockImplementation();
    jest.spyOn(SystemLoggerService, 'warn').mockImplementation();

    // disable http logs
    const loggerServiceMock = mock<LoggerService>();

    // mongodb-memory-server
    mongoMemoryServer = await MongoMemoryServer.create();

    // integration testing envs
    const configService: IntegrationConfigService = {
        MONGO_URI: mongoMemoryServer.getUri(),
        API_MAX_REQ_PER_MINUTE: 200,
        AUTH_MAX_REQ_PER_MINUTE: 200,
        ADMIN_NAME: 'testAdmin',
        ADMIN_PASSWORD: 'testpassword',
        ADMIN_EMAIL: 'test_admin@gmail.com',
        BCRYPT_SALT_ROUNDS: 1,
        JWT_SESSION_EXP_TIME: '30m',
        JWT_EMAIL_VALIDATION_EXP_TIME: '5m',
        JWT_PRIVATE_KEY: 'testkey',
        HTTP_LOGS: false,
    } as const;
    mongoDatabase = new MongoDatabase(configService as ConfigService, loggerServiceMock);
    await mongoDatabase.connect();

    const jwtService = new JwtService(configService.JWT_PRIVATE_KEY);
    testKit.jwtService = jwtService;
    
    testKit.hashingService = new HashingService(configService.BCRYPT_SALT_ROUNDS);

    // redis connection
    redisDatabase = new RedisDatabase(configService as ConfigService);
    const redisInstance = await redisDatabase.connect();
    const redisService = new RedisService(redisInstance);
    testKit.redisService = redisService;

    // models (can not be compiled twice)
    const userModel = UserModelLoader.loadUserModel(configService as ConfigService);
    const tasksModel = TasksModelLoader.loadTasksModel(configService as ConfigService);
    jest.spyOn(UserModelLoader, 'loadUserModel').mockReturnValue(userModel);
    jest.spyOn(TasksModelLoader, 'loadTasksModel').mockReturnValue(tasksModel);
    testKit.userModel = userModel;
    testKit.tasksModel = tasksModel;

    // data generators
    const userDataGenerator = new UserDataGenerator();
    const tasksDataGenerator = new TasksDataGenerator();
    testKit.tasksDataGenerator = tasksDataGenerator;
    testKit.userDataGenerator = userDataGenerator;

    // server
    const appRoutes = new AppRoutes(
        configService as ConfigService,
        loggerServiceMock,
        new AsyncLocalStorage<any>(),
        redisService
    );
    const server = new Server(0, await appRoutes.buildApp(), new ErrorHandlerMiddleware(loggerServiceMock));
    testKit.server = server['app'];
});

afterAll(async () => {
    await Promise.all([
        redisDatabase.disconnect(),
        mongoMemoryServer.stop(),
        mongoDatabase.disconnect()
    ]);
});