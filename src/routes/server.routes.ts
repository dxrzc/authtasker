import { AsyncLocalStorage } from "async_hooks";
import { Model } from "mongoose";
import { Router } from "express";

import {
    ConfigService,
    EmailService,
    HashingService,
    JwtBlackListService,
    JwtService,
    LoggerService,
    RedisService,
    TasksService,
    UserService
} from "@root/services";

import {
    apiLimiterMiddlewareFactory,
    authLimiterMiddlewareFactory,
    errorHandlerMiddlewareFactory,
    requestContextMiddlewareFactory,
    rolesMiddlewareFactory
} from "@root/middlewares";

import { UserRoutes, TasksRoutes } from ".";
import { IAsyncLocalStorageStore } from "@root/interfaces/common/async-local-storage.interface";
import { RequestLimiterMiddlewares, RolesMiddlewares } from "@root/types/middlewares";
import { HealthController } from "@root/controllers/health.controller";
import { ITasks, IUser } from "@root/interfaces";
import { loadTasksModel, loadUserModel } from "@root/databases/mongo/models";

export class AppRoutes {

    private readonly jwtService: JwtService;
    private readonly hashingService: HashingService;
    private readonly emailService?: EmailService;
    private readonly userModel: Model<IUser>;
    private readonly tasksModel: Model<ITasks>;
    private readonly jwtBlacklistService: JwtBlackListService;
    private readonly userService: UserService;
    private readonly tasksService: TasksService;
    private readonly rolesMiddlewares: RolesMiddlewares;
    private readonly requestLimiterMiddlewares: RequestLimiterMiddlewares;
    private readonly healthController: HealthController;

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
        this.jwtService = new JwtService(this.configService.JWT_PRIVATE_KEY);
        this.hashingService = new HashingService(this.configService.BCRYPT_SALT_ROUNDS);
        this.jwtBlacklistService = new JwtBlackListService(this.redisService);
        this.emailService = new EmailService({
            host: this.configService.MAIL_SERVICE_HOST,
            port: this.configService.MAIL_SERVICE_PORT,
            user: this.configService.MAIL_SERVICE_USER,
            pass: this.configService.MAIL_SERVICE_PASS,
        });

        // roles middlewares
        this.rolesMiddlewares = {
            readonly: rolesMiddlewareFactory(
                'readonly',
                this.userModel,
                this.loggerService,
                this.jwtService,
                this.jwtBlacklistService,
            ),

            editor: rolesMiddlewareFactory(
                'editor',
                this.userModel,
                this.loggerService,
                this.jwtService,
                this.jwtBlacklistService,
            ),

            admin: rolesMiddlewareFactory(
                'admin',
                this.userModel,
                this.loggerService,
                this.jwtService,
                this.jwtBlacklistService,
            ),
        };

        this.requestLimiterMiddlewares = {
            authLimiter: authLimiterMiddlewareFactory(configService),
            apiLimiter: apiLimiterMiddlewareFactory(configService),
        }

        // api services
        this.userService = new UserService(
            this.configService,
            this.userModel,
            this.tasksModel,
            this.hashingService,
            this.jwtService,
            this.jwtBlacklistService,
            this.loggerService,
            this.emailService
        );

        this.tasksService = new TasksService(
            this.loggerService,
            this.tasksModel,
            this.userService,
        );

        this.healthController = new HealthController();
    }

    private buildGlobalMiddlewares() {
        return [
            requestContextMiddlewareFactory(
                this.asyncLocalStorage,
                this.loggerService,
            )
        ];
    }

    private async buildUserRoutes(): Promise<Router> {
        const userRoutes = new UserRoutes(
            this.userService,
            this.configService,
            this.userModel,
            this.hashingService,
            this.loggerService,
            this.rolesMiddlewares,
            this.requestLimiterMiddlewares
        );
        return await userRoutes.build();
    }

    private async buildTasksRoutes(): Promise<Router> {
        const tasksRoutes = new TasksRoutes(
            this.tasksService,
            this.loggerService,
            this.rolesMiddlewares,
            this.requestLimiterMiddlewares
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

        router.get('/health', this.rolesMiddlewares.admin, this.healthController.getServerHealth);
        router.use(this.buildGlobalMiddlewares());
        router.use('/api/users', await this.buildUserRoutes());
        router.use('/api/tasks', await this.buildTasksRoutes());
        
        if (this.configService.NODE_ENV === 'development') {
            router.use('/seed', await this.buildSeedRoutes());
        }
        
        router.use(errorHandlerMiddlewareFactory(this.loggerService));
        return router;
    }
}