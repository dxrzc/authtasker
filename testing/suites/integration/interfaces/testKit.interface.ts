import Redis from 'ioredis';
import { Express } from 'express';
import { Model } from 'mongoose';
import { JwtService } from 'src/services/jwt.service';
import { RedisService } from 'src/services/redis.service';
import { IUser } from 'src/interfaces/user/user.interface';
import { LoggerService } from 'src/services/logger.service';
import { ConfigService } from 'src/services/config.service';
import { ITasks } from 'src/interfaces/tasks/task.interface';
import { HashingService } from 'src/services/hashing.service';
import { TasksDataGenerator } from 'src/seed/generators/tasks.generator';
import { UserDataGenerator } from 'src/seed/generators/user.generator';
import { JwtBlackListService } from 'src/services/jwt-blacklist.service';
import { RefreshTokenService } from 'src/services/refresh-token.service';
import { PasswordRecoveryTokenService } from 'src/services/password-recovery-token.service';

export interface ITestKit {
    configService: ConfigService;

    redisService: RedisService;
    redisInstance: Redis;

    userModel: Model<IUser>;
    tasksModel: Model<ITasks>;

    userDataGenerator: UserDataGenerator;
    tasksDataGenerator: TasksDataGenerator;

    server: Express;

    loggerServiceMock: LoggerService;
    sessionJwt: JwtService;
    refreshJwt: JwtService;
    emailValidationJwt: JwtService;
    passwordRecovJwt: JwtService;
    jwtBlacklistService: JwtBlackListService;
    hashingService: HashingService;
    refreshTokenService: RefreshTokenService;

    passwordRecoveryTokenService: PasswordRecoveryTokenService;

    endpoints: {
        seedUsers: string;
        seedTasks: string;

        usersAPI: string;
        myProfile: string;
        register: string;
        login: string;
        logout: string;
        logoutFromAll: string;
        requestEmailValidation: string;
        confirmEmailValidation: string;

        resetPassword: string;
        forgotPassword: string;

        tasksAPI: string;
        createTask: string;
        findAllTasksByUser: string;
        refreshToken: string;

        health: string;
    };
}
