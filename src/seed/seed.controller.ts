import { Request, Response } from 'express';
import { LoggerService } from 'src/services/logger.service';
import { UserSeedService } from './services/user.seed.service';
import { TasksSeedService } from './services/tasks.seed.service';
import { BaseController } from 'src/common/base/base-controller.class';

export class SeedController extends BaseController {
    constructor(
        private readonly loggerService: LoggerService,
        private readonly userSeedService: UserSeedService,
        private readonly tasksSeedService: TasksSeedService,
    ) {
        super();
    }

    readonly seedUsers = this.forwardError(async (req: Request, res: Response) => {
        const total = +req.params.total;
        await this.userSeedService.seedBunch(total);
        res.status(201).end();
        this.loggerService.debug(`Database seeded with ${total} users`);
    });

    readonly seedTasks = this.forwardError(async (req: Request, res: Response) => {
        const total = +req.params.total;
        await this.tasksSeedService.seedBunch(total);
        res.status(201).end();
        this.loggerService.debug(`Database seeded with ${total} tasks for admin user`);
    });
}
