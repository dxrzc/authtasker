import { Apis } from 'src/enums/apis.enum';
import { makeTasksCacheKey } from 'src/functions/cache/make-tasks-cache-key';
import { makeUsersCacheKey } from 'src/functions/cache/make-users-cache-key';
import { CacheService } from 'src/services/cache.service';
import { ConfigService } from 'src/services/config.service';
import { EmailValidationTokenService } from 'src/services/email-validation-token.service';
import { EmailService } from 'src/services/email.service';
import { HashingService } from 'src/services/hashing.service';
import { JwtBlackListService } from 'src/services/jwt-blacklist.service';
import { JwtService } from 'src/services/jwt.service';
import { LoggerService } from 'src/services/logger.service';
import { PasswordRecoveryTokenService } from 'src/services/password-recovery-token.service';
import { RedisService } from 'src/services/redis.service';
import { RefreshTokenService } from 'src/services/refresh-token.service';
import { SessionTokenService } from 'src/services/session-token.service';
import { TasksService } from 'src/services/tasks.service';
import { UserService } from 'src/services/user.service';
import { Models } from 'src/types/models/models.type';
import { TaskDocument } from 'src/types/tasks/task-document.type';
import { UserDocument } from 'src/types/user/user-document.type';

export function buildServices(
    configService: ConfigService,
    loggerService: LoggerService,
    redisService: RedisService,
    models: Models,
) {
    // Utils
    const sessionJwt = new JwtService(configService.JWT_SESSION_PRIVATE_KEY);
    const refreshJwt = new JwtService(configService.JWT_REFRESH_PRIVATE_KEY);
    const emailValidationJwt = new JwtService(configService.JWT_EMAIL_VALIDATION_PRIVATE_KEY);
    const passwordRecoveryJwt = new JwtService(configService.JWT_PASSWORD_RECOVERY_PRIVATE_KEY);
    const hashingService = new HashingService(configService.BCRYPT_SALT_ROUNDS);
    const jwtBlacklistService = new JwtBlackListService(redisService);
    const emailService = new EmailService({
        host: configService.MAIL_SERVICE_HOST,
        port: configService.MAIL_SERVICE_PORT,
        user: configService.MAIL_SERVICE_USER,
        pass: configService.MAIL_SERVICE_PASS,
    });
    // Tokens
    const sessionTokenService = new SessionTokenService(
        configService,
        sessionJwt,
        jwtBlacklistService,
        loggerService,
        models.userModel,
    );
    const refreshTokenService = new RefreshTokenService(
        configService,
        refreshJwt,
        loggerService,
        redisService,
        models.userModel,
    );
    const emailValidationTokenService = new EmailValidationTokenService(
        configService,
        emailValidationJwt,
        jwtBlacklistService,
        loggerService,
    );
    const passwordRecoveryTokenService = new PasswordRecoveryTokenService(
        configService,
        passwordRecoveryJwt,
        jwtBlacklistService,
        loggerService,
    );
    // Cache services
    const usersCacheService = new CacheService<UserDocument>(
        models.userModel,
        loggerService,
        redisService,
        configService.USERS_API_CACHE_TTL_SECONDS,
        configService.CACHE_HARD_TTL_SECONDS,
        makeUsersCacheKey,
        Apis.users,
    );
    const tasksCacheService = new CacheService<TaskDocument>(
        models.tasksModel,
        loggerService,
        redisService,
        configService.TASKS_API_CACHE_TTL_SECONDS,
        configService.CACHE_HARD_TTL_SECONDS,
        makeTasksCacheKey,
        Apis.tasks,
    );
    // Domain services
    const userService = new UserService(
        configService,
        models.userModel,
        models.tasksModel,
        hashingService,
        loggerService,
        emailService,
        sessionTokenService,
        refreshTokenService,
        emailValidationTokenService,
        usersCacheService,
        passwordRecoveryTokenService,
    );
    const tasksService = new TasksService(
        loggerService,
        models.tasksModel,
        userService,
        tasksCacheService,
    );

    return {
        hashingService,
        emailService,
        jwtBlacklistService,
        sessionTokenService,
        refreshTokenService,
        emailValidationTokenService,
        passwordRecoveryTokenService,
        usersCacheService,
        tasksCacheService,
        userService,
        tasksService,
    } as const;
}
