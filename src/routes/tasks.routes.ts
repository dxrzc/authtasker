import { Router } from "express";
import { LoggerService, SystemLoggerService, TasksService } from "@root/services";
import { TasksController } from "@root/controllers";
import { ApiLimiterMiddleware, RolesMiddleware } from '@root/middlewares';

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
            this.loggerService
        );

        SystemLoggerService.info('Task routes loaded');
    }

    async build(): Promise<Router> {
        const router = Router();
        router.use(this.apiLimiterMiddleware.middleware());

        router.post(
            '/create',
            this.rolesMiddleware.middleware('editor'),
            this.tasksController.create
        );

        router.delete(
            '/:id',
            this.rolesMiddleware.middleware('editor'),
            this.tasksController.deleteOne
        );

        router.get(
            '/:id',
            this.rolesMiddleware.middleware('readonly'),
            this.tasksController.findOne
        );

        router.get(
            '/',
            this.rolesMiddleware.middleware('readonly'),
            this.tasksController.findAll
        );

        router.get(
            '/allByUser/:id',
            this.rolesMiddleware.middleware('readonly'),
            this.tasksController.findAllByUser
        );

        router.patch(
            '/:id',
            this.rolesMiddleware.middleware('editor'),
            this.tasksController.updateOne
        );

        return router;
    }
}