import { Router } from "express";
import { Model } from "mongoose";
import { UserRoutes } from './user.routes';
import { TasksRoutes } from './tasks.routes';
import { AsyncLocalStorage } from "async_hooks";
import { JwtService } from '@root/services/jwt.service';
import { UserService } from '@root/services/user.service';
import { CacheService } from '@root/services/cache.service';
import { EmailService } from '@root/services/email.service';
import { RedisService } from '@root/services/redis.service';
import { TasksService } from '@root/services/tasks.service';
import { IUser } from '@root/interfaces/user/user.interface';
import { LoggerService } from '@root/services/logger.service';
import { ConfigService } from '@root/services/config.service';
import { ITasks } from '@root/interfaces/tasks/task.interface';
import { HashingService } from '@root/services/hashing.service';
import { UserResponse } from '@root/types/user/user-response.type';
import { RolesMiddleware } from '@root/middlewares/roles.middleware';
import { makeUsersCacheKey } from '@logic/cache/make-users-cache-key';
import { HealthController } from "@root/controllers/health.controller";
import { JwtBlackListService } from '@root/services/jwt-blacklist.service';
import { SessionTokenService } from '@root/services/session-token.service';
import { loadUserModel } from '@root/databases/mongo/models/user.model.load';
import { loadTasksModel } from '@root/databases/mongo/models/tasks.model.load';
import { ApiLimiterMiddleware } from '@root/middlewares/api-limiter.middleware';
import { AuthLimiterMiddleware } from '@root/middlewares/auth-limiter.middleware';
import { RequestContextMiddleware } from '@root/middlewares/request-context.middleware';
import { EmailValidationTokenService } from '@root/services/email-validation-token.service';
import { IAsyncLocalStorageStore } from "@root/interfaces/common/async-local-storage.interface";
import { TaskResponse } from '@root/types/tasks/task-response.type';
import { makeTasksCacheKey } from '@logic/cache/make-tasks-cache-key';
import { RefreshTokenService } from '@root/services/refresh-token.service';


export class AppRoutes {

    private readonly sessionJwt: JwtService;
    private readonly refreshJwt: JwtService;
    private readonly hashingService: HashingService;
    private readonly emailService?: EmailService;
    private readonly userModel: Model<IUser>;
    private readonly tasksModel: Model<ITasks>;
    private readonly jwtBlacklistService: JwtBlackListService;
    private readonly userService: UserService;
    private readonly tasksService: TasksService;
    private readonly rolesMiddleware: RolesMiddleware;
    private readonly authLimiterMiddleware: AuthLimiterMiddleware;
    private readonly apiLimiterMiddleware: ApiLimiterMiddleware;
    private readonly healthController: HealthController;
    private readonly sessionTokenService: SessionTokenService;
    private readonly refreshTokenService: RefreshTokenService;
    private readonly emailValidationTokenService: EmailValidationTokenService;
    private readonly usersCacheService: CacheService<UserResponse>;
    private readonly tasksCacheService: CacheService<TaskResponse>;

    constructor(
        private readonly configService: ConfigService,
        private readonly loggerService: LoggerService,
        private readonly asyncLocalStorage: AsyncLocalStorage<IAsyncLocalStorageStore>,
        private readonly redisService: RedisService,
    ) {
        // models
        this.userModel = loadUserModel(this.configService);
        this.tasksModel = loadTasksModel(this.configService);

        // services
        this.sessionJwt = new JwtService(this.configService.JWT_PRIVATE_KEY);
        this.refreshJwt = new JwtService(this.configService.JWT_REFRESH_PRIVATE_KEY);
        this.hashingService = new HashingService(this.configService.BCRYPT_SALT_ROUNDS);
        this.jwtBlacklistService = new JwtBlackListService(this.redisService);
        this.refreshTokenService = new RefreshTokenService(
            this.configService,
            this.refreshJwt,
            this.loggerService,
            this.redisService,
            this.userModel
        );
        this.sessionTokenService = new SessionTokenService(
            this.configService,
            this.sessionJwt,
            this.jwtBlacklistService,
            this.loggerService,
            this.userModel,
        );
        this.emailValidationTokenService = new EmailValidationTokenService(
            this.configService,
            this.sessionJwt,
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
        this.authLimiterMiddleware = new AuthLimiterMiddleware(this.configService);
        this.apiLimiterMiddleware = new ApiLimiterMiddleware(this.configService);
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
            this.usersCacheService
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
            this.tasksCacheService
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
            this.loggerService,
            this.rolesMiddleware,
            this.authLimiterMiddleware,
            this.apiLimiterMiddleware,
        );
        return await userRoutes.build();
    }

    private async buildTasksRoutes(): Promise<Router> {
        const tasksRoutes = new TasksRoutes(
            this.tasksService,
            this.loggerService,
            this.rolesMiddleware,
            this.apiLimiterMiddleware,
        );
        return await tasksRoutes.build();
    }

    private async buildSeedRoutes() {
        const { SeedRoutes } = await import("@root/seed/seed.routes");
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