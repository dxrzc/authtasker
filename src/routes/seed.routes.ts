import { Router } from 'express';
import { Model } from 'mongoose';
import { SeedController } from '../controllers/seed.controller';
import { IUser } from 'src/interfaces/user/user.interface';
import { ConfigService } from 'src/services/config.service';
import { LoggerService } from 'src/services/logger.service';
import { ITasks } from 'src/interfaces/tasks/task.interface';
import { UserSeedService } from '../services/user.seed.service';
import { UserDataGenerator } from '../generators/user.generator';
import { HashingService } from 'src/services/hashing.service';
import { TasksSeedService } from '../services/tasks.seed.service';
import { TasksDataGenerator } from '../generators/tasks.generator';
import { SystemLoggerService } from 'src/services/system-logger.service';

export class SeedRoutes {
    constructor(
        private readonly configService: ConfigService,
        private readonly userModel: Model<IUser>,
        private readonly tasksModel: Model<ITasks>,
        private readonly loggerService: LoggerService,
        private readonly hashingService: HashingService,
    ) {
        SystemLoggerService.info('Seed routes loaded');
        if (configService.isProduction())
            throw new Error('Seeding is not allowed in production environment');
    }

    get routes(): Router {
        const router = Router();

        const tasksSeedService = new TasksSeedService(
            this.tasksModel,
            this.userModel,
            new TasksDataGenerator(),
            this.configService,
            this.loggerService,
        );
        const userSeedService = new UserSeedService(
            this.configService,
            this.userModel,
            this.hashingService,
            new UserDataGenerator(),
            this.loggerService,
        );
        const seedController = new SeedController(
            this.loggerService,
            userSeedService,
            tasksSeedService,
        );

        router.post('/users/:total', seedController.seedUsers);
        router.post('/tasks/:total', seedController.seedTasks);
        return router;
    }
}
