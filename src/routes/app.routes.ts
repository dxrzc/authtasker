import { AsyncLocalStorage } from 'async_hooks';
import { Router } from 'express';
import { HealthController } from 'src/controllers/health.controller';
import { IAsyncLocalStorageStore } from 'src/interfaces/others/async-local-storage.interface';
import { SeedRoutes } from 'src/routes/seed.routes';
import { ConfigService } from 'src/services/config.service';
import { LoggerService } from 'src/services/logger.service';
import { RedisService } from 'src/services/redis.service';
import { buildMiddlewares } from './factories/middlewares.factory';
import { buildModels } from './factories/models.factory';
import { buildServices } from './factories/services.factory';
import { HealthRoutes } from './health.routes';
import { TasksRoutes } from './tasks.routes';
import { UserRoutes } from './user.routes';
import { createAdmin } from 'src/admin/create-admin';
import { Redis } from 'ioredis';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yaml';
import { readFileSync } from 'fs';
import { join } from 'path';

export class AppRoutes {
    private readonly healthController: HealthController;
    private readonly services: ReturnType<typeof buildServices>;
    private readonly middlewares: ReturnType<typeof buildMiddlewares>;
    private readonly models: ReturnType<typeof buildModels>;
    private swaggerDocument: any;

    constructor(
        private readonly configService: ConfigService,
        private readonly loggerService: LoggerService,
        private readonly asyncLocalStorage: AsyncLocalStorage<IAsyncLocalStorageStore>,
        private readonly redisService: RedisService,
        private readonly redisClient: Redis,
    ) {
        this.models = buildModels(this.configService);
        this.services = buildServices(
            this.configService,
            this.loggerService,
            this.redisService,
            this.models,
        );
        this.middlewares = buildMiddlewares(
            this.configService,
            this.loggerService,
            this.asyncLocalStorage,
            this.services,
            this.redisClient,
        );
        this.healthController = new HealthController();
        this.loadSwaggerDocument();
    }

    private loadSwaggerDocument(): void {
        try {
            const swaggerPath = join(process.cwd(), 'src', 'docs', 'swagger.yaml');
            const file = readFileSync(swaggerPath, 'utf8');
            this.swaggerDocument = YAML.parse(file);
        } catch (err) {
            this.loggerService.error(
                'Failed to load Swagger documentation. API documentation will not be available:',
                err,
            );
        }
    }

    private buildUserRoutes(): Router {
        const userRoutes = new UserRoutes(
            this.middlewares.rateLimiterMiddleware,
            this.middlewares.rolesMiddleware,
            this.services.userService,
        );
        return userRoutes.routes;
    }

    private buildTasksRoutes(): Router {
        const tasksRoutes = new TasksRoutes(
            this.middlewares.rateLimiterMiddleware,
            this.middlewares.rolesMiddleware,
            this.services.tasksService,
        );
        return tasksRoutes.routes;
    }

    private buildSeedRoutes(): Router {
        const seedRoutes = new SeedRoutes(
            this.configService,
            this.models.userModel,
            this.models.tasksModel,
            this.loggerService,
            this.services.hashingService,
        );
        return seedRoutes.routes;
    }

    private buildHealthRoutes(): Router {
        const healthRoutes = new HealthRoutes(this.middlewares.rolesMiddleware);
        return healthRoutes.routes;
    }

    async createInitialAdminUser(): Promise<void> {
        await createAdmin(this.models.userModel, this.configService, this.services.hashingService);
    }

    get routes(): Router {
        const router = Router();

        if (this.swaggerDocument) {
            router.use('/api-docs', swaggerUi.serve, swaggerUi.setup(this.swaggerDocument));
        }

        router.use(this.middlewares.requestContextMiddleware.middleware());
        router.use('/system', this.buildHealthRoutes());
        router.use('/api/users', this.buildUserRoutes());
        router.use('/api/tasks', this.buildTasksRoutes());
        if (this.configService.isDevelopment) router.use('/seed', this.buildSeedRoutes());
        return router;
    }
}
