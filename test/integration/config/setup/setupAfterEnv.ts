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
import { JwtBlackListService } from '@root/services/jwt-blacklist.service';
import { TasksDataGenerator } from '@root/seed/generators/tasks.generator';
import * as UserModelLoader from '@root/databases/mongo/models/user.model.load';
import * as TasksModelLoader from '@root/databases/mongo/models/tasks.model.load';
import { ErrorHandlerMiddleware } from '@root/middlewares/error-handler.middleware';
import { RefreshTokenService } from '@root/services/refresh-token.service';
import { PasswordRecoveryTokenService } from '@root/services/password-recovery-token.service';

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
    testKit.loggerServiceMock = loggerServiceMock;

    // mongodb-memory-server
    mongoMemoryServer = await MongoMemoryServer.create();

    // integration testing envs
    const configService: IntegrationConfigService = {
        NODE_ENV: 'integration',
        MONGO_URI: mongoMemoryServer.getUri(),
        API_MAX_REQ_PER_MINUTE: 200,
        AUTH_MAX_REQ_PER_MINUTE: 200,
        ADMIN_NAME: 'testAdmin',
        ADMIN_PASSWORD: 'testpassword',
        ADMIN_EMAIL: 'test_admin@gmail.com',
        BCRYPT_SALT_ROUNDS: 1,
        JWT_SESSION_EXP_TIME: '30m',
        JWT_EMAIL_VALIDATION_EXP_TIME: '5m',
        JWT_SESSION_PRIVATE_KEY: 'testkey',
        JWT_EMAIL_VALIDATION_PRIVATE_KEY: 'emailValidationKey123Supersecret',
        USERS_API_CACHE_TTL_SECONDS: 60,
        TASKS_API_CACHE_TTL_SECONDS: 60,
        CACHE_HARD_TTL_SECONDS: 600,
        PAGINATION_CACHE_TTLS_SECONDS: 20,
        HTTP_LOGS: false,
        JWT_REFRESH_EXP_TIME: '10d',
        JWT_REFRESH_PRIVATE_KEY: 'testkey2',
        MAX_REFRESH_TOKENS_PER_USER: 3,
        JWT_PASSWORD_RECOVERY_EXP_TIME: '20m',
        JWT_PASSWORD_RECOVERY_PRIVATE_KEY: 'passwordRecov123Key'
    } as const;
    mongoDatabase = new MongoDatabase(configService as ConfigService, loggerServiceMock);
    await mongoDatabase.connect();

    // redis connection
    redisDatabase = new RedisDatabase(configService as ConfigService);
    const redisInstance = await redisDatabase.connect();
    const redisService = new RedisService(redisInstance);

    // models (can not be compiled twice)
    const userModel = UserModelLoader.loadUserModel(configService as ConfigService);
    const tasksModel = TasksModelLoader.loadTasksModel(configService as ConfigService);
    jest.spyOn(UserModelLoader, 'loadUserModel').mockReturnValue(userModel);
    jest.spyOn(TasksModelLoader, 'loadTasksModel').mockReturnValue(tasksModel);
    testKit.userModel = userModel;
    testKit.tasksModel = tasksModel;

    // helpers
    testKit.configService = configService as ConfigService;
    testKit.redisService = redisService;
    testKit.redisInstance = redisInstance;
    testKit.sessionJwt = new JwtService(configService.JWT_SESSION_PRIVATE_KEY);
    testKit.refreshJwt = new JwtService(configService.JWT_REFRESH_PRIVATE_KEY);
    testKit.emailValidationJwt = new JwtService(configService.JWT_EMAIL_VALIDATION_PRIVATE_KEY);

    testKit.passwordRecovJwt = new JwtService(configService.JWT_PASSWORD_RECOVERY_PRIVATE_KEY);

    testKit.jwtBlacklistService = new JwtBlackListService(redisService);
    testKit.hashingService = new HashingService(configService.BCRYPT_SALT_ROUNDS);
    testKit.refreshTokenService = new RefreshTokenService(
        configService as ConfigService,
        testKit.refreshJwt,
        loggerServiceMock,
        redisService,
        userModel,
    );
    testKit.passwordRecoveryTokenService = new PasswordRecoveryTokenService(
        configService as ConfigService,
        testKit.passwordRecovJwt,
        testKit.jwtBlacklistService,
        testKit.loggerServiceMock
    );

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