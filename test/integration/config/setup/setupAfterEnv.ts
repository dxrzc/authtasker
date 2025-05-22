import { AsyncLocalStorage } from "async_hooks";
import { MongoMemoryServer } from "mongodb-memory-server";
import { mock } from "jest-mock-extended";

import { ConfigService, HashingService, LoggerService, RedisService, SystemLoggerService } from "@root/services";
import { MongoDatabase } from "@root/databases/mongo/mongo.database";
import { TasksDataGenerator, UserDataGenerator } from "@root/seed/generators";
import { AppRoutes } from "@root/routes";
import { Server } from "@root/server/server.init";
import * as ModelLoader from "@root/databases/mongo/models";
import { testKit } from "@integration/utils/testKit.util";
import { type IntegrationConfigService } from "./types/config.service.type";

let mongoMemoryServer: MongoMemoryServer;
let mongoDatabase: MongoDatabase;

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
        JWT_SESSION_EXPIRATION_TIME: '30m',
        JWT_PRIVATE_KEY: 'testkey',
        HTTP_LOGS: false,
    } as const;

    mongoDatabase = new MongoDatabase(configService as ConfigService, loggerServiceMock);
    await mongoDatabase.connect();

    // ioredis-mock
    const redisService = new RedisService(configService as ConfigService);
    await redisService.connect();

    // models
    const userModel = ModelLoader.loadUserModel(configService as ConfigService);
    const tasksModel = ModelLoader.loadTasksModel(configService as ConfigService);
    testKit.userModel = userModel;
    testKit.tasksModel = tasksModel;

    // models can not be compiled twice.
    jest.spyOn(ModelLoader, 'loadUserModel').mockReturnValue(userModel);
    jest.spyOn(ModelLoader, 'loadTasksModel').mockReturnValue(tasksModel);

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
    const server = new Server(0, await appRoutes.buildApp());
    testKit.server = server['app'];

    // hashing service
    testKit.hashingService = new HashingService(configService.BCRYPT_SALT_ROUNDS);

    // endpoints
    testKit.endpoints.usersAPI = '/api/users';
    testKit.endpoints.register = `${testKit.endpoints.usersAPI}/register`;
    testKit.endpoints.login = `${testKit.endpoints.usersAPI}/login`;
    testKit.endpoints.requestEmailValidation = `${testKit.endpoints.usersAPI}/requestEmailValidation`;
    testKit.endpoints.tasksAPI = '/api/tasks';
    testKit.endpoints.createTask = `${testKit.endpoints.tasksAPI}/create`;
});

afterAll(async () => {
    await mongoDatabase.disconnect();
    await mongoMemoryServer.stop();
});