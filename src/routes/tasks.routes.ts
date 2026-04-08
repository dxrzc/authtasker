import { Router } from 'express';
import { TasksController } from 'src/controllers/tasks.controller';
import { RateLimiter } from 'src/enums/rate-limiter.enum';
import { RequestLocation } from 'src/enums/request-location.enum';
import { UserRole } from 'src/enums/user-role.enum';
import { tasksApiErrors } from 'src/messages/tasks-api.error.messages';
import { usersApiErrors } from 'src/messages/users-api.error.messages';
import { AuthMiddleware } from 'src/middlewares/auth.middleware';
import { RateLimiterMiddleware } from 'src/middlewares/rate-limiter.middleware';
import { RolesMiddleware } from 'src/middlewares/roles.middleware';
import { ValidateIdMiddleware } from 'src/middlewares/validate-id.middleware';
import { SystemLoggerService } from 'src/services/system-logger.service';
import { TasksService } from 'src/services/tasks.service';

export class TasksRoutes {
    private readonly tasksController: TasksController;

    constructor(
        private readonly authMiddleware: AuthMiddleware,
        private readonly rateLimiter: RateLimiterMiddleware,
        private readonly rolesMiddleware: RolesMiddleware,
        private readonly validateIdMiddleware: ValidateIdMiddleware,
        private readonly tasksService: TasksService,
    ) {
        this.tasksController = new TasksController(this.tasksService);
        SystemLoggerService.info('Task routes loaded');
    }

    get routes(): Router {
        const router = Router();
        const verifyTaskIdFromParamsMiddleware = this.validateIdMiddleware.middleware({
            requestLocation: RequestLocation.params,
            errorMessage: tasksApiErrors.NOT_FOUND,
            propertyName: 'id',
        });

        router.post(
            '/create',
            this.rateLimiter.middleware(RateLimiter.relaxed),
            this.authMiddleware.middleware(),
            this.rolesMiddleware.middleware(UserRole.EDITOR),
            this.tasksController.create,
        );

        router.delete(
            '/:id',
            this.rateLimiter.middleware(RateLimiter.relaxed),
            this.authMiddleware.middleware(),
            this.rolesMiddleware.middleware(UserRole.EDITOR),
            verifyTaskIdFromParamsMiddleware,
            this.tasksController.deleteOne,
        );

        router.get(
            '/',
            this.rateLimiter.middleware(RateLimiter.relaxed),
            this.authMiddleware.middleware(),
            this.rolesMiddleware.middleware(UserRole.READONLY),
            this.validateIdMiddleware.middleware({
                requestLocation: RequestLocation.query,
                errorMessage: usersApiErrors.NOT_FOUND,
                propertyName: 'user',
                optional: true,
            }),
            this.tasksController.findAll,
        );

        router.get(
            '/:id',
            this.rateLimiter.middleware(RateLimiter.relaxed),
            this.authMiddleware.middleware(),
            this.rolesMiddleware.middleware(UserRole.READONLY),
            verifyTaskIdFromParamsMiddleware,
            this.tasksController.findOne,
        );

        router.patch(
            '/:id',
            this.rateLimiter.middleware(RateLimiter.relaxed),
            this.authMiddleware.middleware(),
            this.rolesMiddleware.middleware(UserRole.EDITOR),
            verifyTaskIdFromParamsMiddleware,
            this.tasksController.updateOne,
        );

        return router;
    }
}
