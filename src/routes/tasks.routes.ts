import { Router } from 'express';
import { TasksController } from 'src/controllers/tasks.controller';
import { RateLimiter } from 'src/enums/rate-limiter.enum';
import { UserRole } from 'src/enums/user-role.enum';
import { RateLimiterMiddleware } from 'src/middlewares/rate-limiter.middleware';
import { RolesMiddleware } from 'src/middlewares/roles.middleware';
import { SystemLoggerService } from 'src/services/system-logger.service';
import { TasksService } from 'src/services/tasks.service';
import { CreateTaskValidator } from 'src/validators/models/tasks/create-task.validator';
import { UpdateTaskValidator } from 'src/validators/models/tasks/update-task.validator';
import { TaskStatusValidator } from 'src/validators/models/tasks/task-status.validator';

export class TasksRoutes {
    private readonly tasksController: TasksController;

    constructor(
        private readonly rateLimiter: RateLimiterMiddleware,
        private readonly rolesMiddleware: RolesMiddleware,
        private readonly tasksService: TasksService,
    ) {
        this.tasksController = new TasksController(
            this.tasksService,
            new CreateTaskValidator(),
            new UpdateTaskValidator(),
            new TaskStatusValidator(),
        );
        SystemLoggerService.info('Task routes loaded');
    }

    get routes(): Router {
        const router = Router();
        router.use(this.rateLimiter.middleware(RateLimiter.relaxed));

        router.post(
            '/create',
            this.rolesMiddleware.middleware(UserRole.EDITOR),
            this.tasksController.create,
        );

        router.delete(
            '/:id',
            this.rolesMiddleware.middleware(UserRole.EDITOR),
            this.tasksController.deleteOne,
        );

        router.get(
            '/:id',
            this.rolesMiddleware.middleware(UserRole.READONLY),
            this.tasksController.findOne,
        );

        router.get(
            '/',
            this.rolesMiddleware.middleware(UserRole.READONLY),
            this.tasksController.findAll,
        );

        router.get(
            '/all-by-user/:id',
            this.rolesMiddleware.middleware(UserRole.READONLY),
            this.tasksController.findAllByUser,
        );

        router.get(
            '/all-by-status/:status',
            this.rolesMiddleware.middleware(UserRole.READONLY),
            this.tasksController.findAllByStatus,
        );

        router.patch(
            '/:id',
            this.rolesMiddleware.middleware(UserRole.EDITOR),
            this.tasksController.updateOne,
        );

        return router;
    }
}
