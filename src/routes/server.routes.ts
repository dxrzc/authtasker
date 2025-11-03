import { Router } from "express";
import { Model } from "mongoose";
import { UserRoutes } from './user.routes';
import { TasksRoutes } from './tasks.routes';
import { AsyncLocalStorage } from "async_hooks";
import { JwtService } from 'src/services/jwt.service';
import { UserService } from 'src/services/user.service';
import { CacheService } from 'src/services/cache.service';
import { EmailService } from 'src/services/email.service';
import { RedisService } from 'src/services/redis.service';
import { TasksService } from 'src/services/tasks.service';
import { IUser } from 'src/interfaces/user/user.interface';
import { LoggerService } from 'src/services/logger.service';
import { ConfigService } from 'src/services/config.service';
import { ITasks } from 'src/interfaces/tasks/task.interface';
import { HashingService } from 'src/services/hashing.service';
import { UserResponse } from 'src/types/user/user-response.type';
import { TaskResponse } from 'src/types/tasks/task-response.type';
import { RolesMiddleware } from 'src/middlewares/roles.middleware';
import { makeUsersCacheKey } from 'src/common/logic/cache/make-users-cache-key';
import { HealthController } from "src/controllers/health.controller";
import { JwtBlackListService } from 'src/services/jwt-blacklist.service';
import { RefreshTokenService } from 'src/services/refresh-token.service';
import { SessionTokenService } from 'src/services/session-token.service';
import { loadUserModel } from 'src/databases/mongo/models/user.model.load';
import { loadTasksModel } from 'src/databases/mongo/models/tasks.model.load';
import { ApiLimiterMiddleware } from 'src/middlewares/api-limiter.middleware';
import { RequestContextMiddleware } from 'src/middlewares/request-context.middleware';
import { EmailValidationTokenService } from 'src/services/email-validation-token.service';
import { IAsyncLocalStorageStore } from "src/interfaces/common/async-local-storage.interface";
import { makeTasksCacheKey } from 'src/common/logic/cache/make-tasks-cache-key';
import { PaginationCacheService } from 'src/services/pagination-cache.service';
import { PasswordRecoveryTokenService } from 'src/services/password-recovery-token.service';


export class AppRoutes {
    
    private readonly hashingService: HashingService;
    private readonly emailService?: EmailService;
    private readonly userModel: Model<IUser>;
    private readonly tasksModel: Model<ITasks>;
    private readonly jwtBlacklistService: JwtBlackListService;
    private readonly userService: UserService;
    private readonly tasksService: TasksService;
    private readonly rolesMiddleware: RolesMiddleware;
    private readonly apiLimiterMiddleware: ApiLimiterMiddleware;
    private readonly healthController: HealthController;
    private readonly sessionTokenService: SessionTokenService;
    private readonly refreshTokenService: RefreshTokenService;
    private readonly emailValidationTokenService: EmailValidationTokenService;
    private readonly usersCacheService: CacheService<UserResponse>;
    private readonly tasksCacheService: CacheService<TaskResponse>;
    private readonly paginationCacheService: PaginationCacheService;
    private readonly passwordRecoverTokenService: PasswordRecoveryTokenService;

    constructor(
        private readonly configService: ConfigService,
        private readonly loggerService: LoggerService,
        private readonly asyncLocalStorage: AsyncLocalStorage<IAsyncLocalStorageStore>,
        private readonly redisService: RedisService,
    ) {
        // models
        this.userModel = loadUserModel(this.configService);
        this.tasksModel = loadTasksModel(this.configService);

        this.hashingService = new HashingService(this.configService.BCRYPT_SALT_ROUNDS);
        this.jwtBlacklistService = new JwtBlackListService(this.redisService);
        this.refreshTokenService = new RefreshTokenService(
            this.configService,
            new JwtService(this.configService.JWT_REFRESH_PRIVATE_KEY),
            this.loggerService,
            this.redisService,
            this.userModel
        );
        
        this.sessionTokenService = new SessionTokenService(
            this.configService,
            new JwtService(this.configService. JWT_SESSION_PRIVATE_KEY), 
            this.jwtBlacklistService,
            this.loggerService,
            this.userModel,
        );
        this.emailValidationTokenService = new EmailValidationTokenService(
            this.configService,
            new JwtService(this.configService.JWT_EMAIL_VALIDATION_PRIVATE_KEY), 
            this.jwtBlacklistService,
            this.loggerService,
        );
        this.passwordRecoverTokenService = new PasswordRecoveryTokenService(
            this.configService,
            new JwtService(this.configService.JWT_PASSWORD_RECOVERY_PRIVATE_KEY),
            this.jwtBlacklistService,
            this.loggerService,
        );

        this.emailService = new EmailService({
            host: this.configService.MAIL_SERVICE_HOST,
            port: this.configService.MAIL_SERVICE_PORT,
            user: this.configService.MAIL_SERVICE_USER,
            pass: this.configService.MAIL_SERVICE_PASS,
        });

        // Middlewares        
        this.apiLimiterMiddleware = new ApiLimiterMiddleware(this.configService, this.loggerService);
        this.rolesMiddleware = new RolesMiddleware(
            this.sessionTokenService,
            this.loggerService
        );

        this.usersCacheService = new CacheService<UserResponse>(
            this.userModel,
            this.loggerService,
            this.redisService,
            configService.USERS_API_CACHE_TTL_SECONDS,
            configService.CACHE_HARD_TTL_SECONDS,
            makeUsersCacheKey
        );

        this.paginationCacheService = new PaginationCacheService(
            this.loggerService,
            this.redisService,
            this.configService
        );
        // api services
        this.userService = new UserService(
            this.configService,
            this.userModel,
            this.tasksModel,
            this.hashingService,
            this.loggerService,
            this.emailService,
            this.sessionTokenService,
            this.refreshTokenService,
            this.emailValidationTokenService,
            this.usersCacheService,
            this.paginationCacheService,
            this.passwordRecoverTokenService,
        );

        this.tasksCacheService = new CacheService<TaskResponse>(
            this.tasksModel,
            this.loggerService,
            this.redisService,
            configService.TASKS_API_CACHE_TTL_SECONDS,
            configService.CACHE_HARD_TTL_SECONDS,
            makeTasksCacheKey
        )

        this.tasksService = new TasksService(
            this.loggerService,
            this.tasksModel,
            this.userService,
            this.tasksCacheService,
            this.paginationCacheService
        );

        this.healthController = new HealthController();
    }

    private buildGlobalMiddlewares() {
        const requestContextMiddleware = new RequestContextMiddleware(
            this.asyncLocalStorage,
            this.loggerService,
        );

        return [
            requestContextMiddleware.middleware()
        ];
    }

    private async buildUserRoutes(): Promise<Router> {
        const userRoutes = new UserRoutes(
            this.userService,
            this.configService,
            this.userModel,
            this.hashingService,
            this.rolesMiddleware,
            this.apiLimiterMiddleware,
        );
        return await userRoutes.build();
    }

    private async buildTasksRoutes(): Promise<Router> {
        const tasksRoutes = new TasksRoutes(
            this.tasksService,
            this.rolesMiddleware,
            this.apiLimiterMiddleware,
        );
        return await tasksRoutes.build();
    }

    private async buildSeedRoutes() {
        const { SeedRoutes } = await import("src/seed/seed.routes");
        const seedRoutes = new SeedRoutes(
            this.configService,
            this.userModel,
            this.tasksModel,
            this.loggerService,
            this.hashingService,
        );

        return seedRoutes.build();
    }

    async buildApp() {
        const router = Router();

        router.get('/health', this.rolesMiddleware.middleware('admin'), this.healthController.getServerHealth);
        router.use(this.buildGlobalMiddlewares());
        router.use('/api/users', await this.buildUserRoutes());
        router.use('/api/tasks', await this.buildTasksRoutes());

        if (this.configService.NODE_ENV === 'development') {
            router.use('/seed', await this.buildSeedRoutes());
        }
        return router;
    }
}