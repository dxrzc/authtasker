import { Router } from "express";
import { LoggerService, SystemLoggerService, TasksService } from "@root/services";
import { TasksController } from "@root/controllers";
import { ApiLimiterMiddleware, RolesMiddleware } from '@root/middlewares';
import { CreateTaskValidator, UpdateTaskValidator } from '@root/validators/models/tasks';

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
            this.loggerService,
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