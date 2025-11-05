import { Router } from 'express';
import { ApiType } from 'src/enums/api-type.enum';
import { TasksService } from 'src/services/tasks.service';
import { TasksController } from 'src/controllers/tasks.controller';
import { RolesMiddleware } from 'src/middlewares/roles.middleware';
import { SystemLoggerService } from 'src/services/system-logger.service';
import { ApiLimiterMiddleware } from 'src/middlewares/api-limiter.middleware';
import { CreateTaskValidator } from 'src/validators/models/tasks/create-task.validator';
import { UpdateTaskValidator } from 'src/validators/models/tasks/update-task.validator';

export class TasksRoutes {
    private readonly tasksController: TasksController;

    constructor(
        private readonly tasksService: TasksService,
        private readonly rolesMiddleware: RolesMiddleware,
        private readonly apiLimiterMiddleware: ApiLimiterMiddleware,
    ) {
        this.tasksController = new TasksController(
            this.tasksService,
            new CreateTaskValidator(),
            new UpdateTaskValidator(),
        );

        SystemLoggerService.info('Task routes loaded');
    }

    build(): Router {
        const router = Router();
        router.use(this.apiLimiterMiddleware.middleware(ApiType.coreApi));

        router.post(
            '/create',
            this.rolesMiddleware.middleware('editor'),
            this.tasksController.create,
        );

        router.delete(
            '/:id',
            this.rolesMiddleware.middleware('editor'),
            this.tasksController.deleteOne,
        );

        router.get(
            '/:id',
            this.rolesMiddleware.middleware('readonly'),
            this.tasksController.findOne,
        );

        router.get('/', this.rolesMiddleware.middleware('readonly'), this.tasksController.findAll);

        router.get(
            '/allByUser/:id',
            this.rolesMiddleware.middleware('readonly'),
            this.tasksController.findAllByUser,
        );

        router.patch(
            '/:id',
            this.rolesMiddleware.middleware('editor'),
            this.tasksController.updateOne,
        );

        return router;
    }
}
