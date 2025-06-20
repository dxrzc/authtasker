import { Router } from "express";
import { TasksService } from '@root/services/tasks.service';
import { LoggerService } from '@root/services/logger.service';
import { TasksController } from '@root/controllers/tasks.controller';
import { RolesMiddleware } from '@root/middlewares/roles.middleware';
import { SystemLoggerService } from '@root/services/system-logger.service';
import { ApiLimiterMiddleware } from '@root/middlewares/api-limiter.middleware';
import { CreateTaskValidator } from '@root/validators/models/tasks/create-task.validator';
import { UpdateTaskValidator } from '@root/validators/models/tasks/update-task.validator';

export class TasksRoutes {

    private readonly tasksController: TasksController;

    constructor(
        private readonly tasksService: TasksService,
        private readonly loggerService: LoggerService,
        private readonly rolesMiddleware: RolesMiddleware,
        private readonly apiLimiterMiddleware: ApiLimiterMiddleware,
    ) {
        this.tasksController = new TasksController(
            this.tasksService,            
            new CreateTaskValidator(),
            new UpdateTaskValidator()
        );

        SystemLoggerService.info('Task routes loaded');
    }

    async build(): Promise<Router> {
        const router = Router();
        router.use(this.apiLimiterMiddleware.middleware());

        router.post(
            '/create',
            this.rolesMiddleware.middleware('editor'),
            this.tasksController.createFwdErr()
        );

        router.delete(
            '/:id',
            this.rolesMiddleware.middleware('editor'),
            this.tasksController.deleteOneFwdErr()
        );

        router.get(
            '/:id',
            this.rolesMiddleware.middleware('readonly'),
            this.tasksController.findOneFwdErr()
        );

        router.get(
            '/',
            this.rolesMiddleware.middleware('readonly'),
            this.tasksController.findAllFwdErr()
        );

        router.get(
            '/allByUser/:id',
            this.rolesMiddleware.middleware('readonly'),
            this.tasksController.findAllByUserFwdErr()
        );

        router.patch(
            '/:id',
            this.rolesMiddleware.middleware('editor'),
            this.tasksController.updateOneFwdErr()
        );

        return router;
    }
}