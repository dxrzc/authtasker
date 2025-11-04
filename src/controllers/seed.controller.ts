import { Request, Response } from 'express';
import { LoggerService } from 'src/services/logger.service';
import { TasksSeedService } from 'src/services/tasks.seed.service';
import { UserSeedService } from 'src/services/user.seed.service';

export class SeedController {
    constructor(
        private readonly loggerService: LoggerService,
        private readonly userSeedService: UserSeedService,
        private readonly tasksSeedService: TasksSeedService,
    ) {}

    readonly seedUsers = async (req: Request, res: Response) => {
        const total = +req.params.total;
        await this.userSeedService.seedBunch(total);
        res.status(201).end();
        this.loggerService.debug(`Database seeded with ${total} users`);
    };

    readonly seedTasks = async (req: Request, res: Response) => {
        const total = +req.params.total;
        await this.tasksSeedService.seedBunch(total);
        res.status(201).end();
        this.loggerService.debug(`Database seeded with ${total} tasks for admin user`);
    };
}
