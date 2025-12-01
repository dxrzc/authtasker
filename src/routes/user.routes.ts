import { Router } from 'express';
import { UserService } from 'src/services/user.service';
import { UserController } from 'src/controllers/user.controller';
import { RolesMiddleware } from 'src/middlewares/roles.middleware';
import { SystemLoggerService } from 'src/services/system-logger.service';
import { RateLimiterMiddleware } from 'src/middlewares/rate-limiter.middleware';
import { LoginUserValidator } from 'src/validators/models/user/login-user.validator';
import { UpdateUserValidator } from 'src/validators/models/user/update-user.validator';
import { CreateUserValidator } from 'src/validators/models/user/create-user.validator';
import { ResetPasswordValidator } from 'src/validators/models/user/reset-password.validator';
import { UserRole } from 'src/enums/user-role.enum';
import { RateLimiter } from 'src/enums/rate-limiter.enum';
import { PasswordRecoveryValidator } from 'src/validators/models/user/password-recovery.validator';

export class UserRoutes {
    private readonly userController: UserController;

    constructor(
        private readonly apiLimiterMiddleware: RateLimiterMiddleware,
        private readonly rolesMiddleware: RolesMiddleware,
        private readonly userService: UserService,
    ) {
        this.userController = new UserController(
            this.userService,
            new CreateUserValidator(),
            new UpdateUserValidator(),
            new LoginUserValidator(),
            new PasswordRecoveryValidator(),
            new ResetPasswordValidator(),
            userService.loggerService,
        );
        SystemLoggerService.info('User routes loaded');
    }

    get routes(): Router {
        const router = Router();

        router.get(
            '/reset-password',
            this.apiLimiterMiddleware.middleware(RateLimiter.critical),
            this.userController.resetPasswordForm,
        );

        router.get(
            '/me',
            this.apiLimiterMiddleware.middleware(RateLimiter.relaxed),
            this.rolesMiddleware.middleware(UserRole.READONLY),
            this.userController.me,
        );

        router.post(
            '/register',
            this.apiLimiterMiddleware.middleware(RateLimiter.critical),
            this.userController.create,
        );

        router.post(
            '/login',
            this.apiLimiterMiddleware.middleware(RateLimiter.critical),
            this.userController.login,
        );

        router.post(
            '/logout-all',
            this.apiLimiterMiddleware.middleware(RateLimiter.critical),
            this.userController.logoutFromAll,
        );

        router.post(
            '/refresh-token',
            this.apiLimiterMiddleware.middleware(RateLimiter.critical),
            this.userController.refresh,
        );

        router.post(
            '/request-email-validation',
            this.apiLimiterMiddleware.middleware(RateLimiter.critical),
            this.rolesMiddleware.middleware(UserRole.READONLY),
            this.userController.requestEmailValidation,
        );

        router.post(
            '/logout',
            this.apiLimiterMiddleware.middleware(RateLimiter.critical),
            this.rolesMiddleware.middleware(UserRole.READONLY),
            this.userController.logout,
        );

        router.get(
            '/confirm-email-validation',
            this.apiLimiterMiddleware.middleware(RateLimiter.critical),
            this.userController.confirmEmailValidation,
        );

        router.delete(
            '/:id',
            this.apiLimiterMiddleware.middleware(RateLimiter.relaxed),
            this.rolesMiddleware.middleware(UserRole.READONLY),
            this.userController.deleteOne,
        );

        router.patch(
            '/:id',
            this.apiLimiterMiddleware.middleware(RateLimiter.relaxed),
            this.rolesMiddleware.middleware(UserRole.READONLY),
            this.userController.updateOne,
        );

        router.get(
            '/:id',
            this.apiLimiterMiddleware.middleware(RateLimiter.relaxed),
            this.rolesMiddleware.middleware(UserRole.READONLY),
            this.userController.findOne,
        );

        router.get(
            '/',
            this.apiLimiterMiddleware.middleware(RateLimiter.relaxed),
            this.rolesMiddleware.middleware(UserRole.READONLY),
            this.userController.findAll,
        );

        router.post(
            '/forgot-password',
            this.apiLimiterMiddleware.middleware(RateLimiter.critical),
            this.userController.requestPasswordRecovery,
        );

        router.post(
            '/reset-password',
            this.apiLimiterMiddleware.middleware(RateLimiter.critical),
            this.userController.resetPassword,
        );

        return router;
    }
}
