import { Router } from 'express';
import { Model } from 'mongoose';
import { ApiType } from 'src/enums/api-type.enum';
import { createAdmin } from 'src/admin/create-admin';
import { UserService } from 'src/services/user.service';
import { IUser } from 'src/interfaces/user/user.interface';
import { ConfigService } from 'src/services/config.service';
import { HashingService } from 'src/services/hashing.service';
import { UserController } from 'src/controllers/user.controller';
import { RolesMiddleware } from 'src/middlewares/roles.middleware';
import { SystemLoggerService } from 'src/services/system-logger.service';
import { ApiLimiterMiddleware } from 'src/middlewares/api-limiter.middleware';
import { LoginUserValidator } from 'src/validators/models/user/login-user.validator';
import { UpdateUserValidator } from 'src/validators/models/user/update-user.validator';
import { CreateUserValidator } from 'src/validators/models/user/create-user.validator';
import { ResetPasswordValidator } from 'src/validators/models/user/reset-password.validator';
import { ForgotPasswordValidator } from 'src/validators/models/user/forgot-password.validator';

export class UserRoutes {
    private readonly userController: UserController;

    constructor(
        private readonly userService: UserService,
        private readonly configService: ConfigService,
        private readonly userModel: Model<IUser>,
        private readonly hashingService: HashingService,
        private readonly rolesMiddleware: RolesMiddleware,
        private readonly apiLimiterMiddleware: ApiLimiterMiddleware,
    ) {
        this.userController = new UserController(
            this.userService,
            new CreateUserValidator(),
            new UpdateUserValidator(),
            new LoginUserValidator(),
            new ForgotPasswordValidator(),
            new ResetPasswordValidator(),
        );

        SystemLoggerService.info('User routes loaded');
    }

    private async initialData() {
        await createAdmin(this.userModel, this.configService, this.hashingService);
    }

    async build(): Promise<Router> {
        await this.initialData();

        const router = Router();

        router.get(
            '/reset-password',
            this.apiLimiterMiddleware.middleware(ApiType.authApi),
            this.userController.resetPasswordFormFwdErr(),
        );

        router.get(
            '/me',
            this.apiLimiterMiddleware.middleware(ApiType.coreApi),
            this.rolesMiddleware.middleware('readonly'),
            this.userController.meFwdErr(),
        );

        router.post(
            '/register',
            this.apiLimiterMiddleware.middleware(ApiType.authApi),
            this.userController.createFwdErr(),
        );

        router.post(
            '/login',
            this.apiLimiterMiddleware.middleware(ApiType.authApi),
            this.userController.loginFwdErr(),
        );

        router.post(
            '/logoutFromAll',
            this.apiLimiterMiddleware.middleware(ApiType.authApi),
            this.userController.logoutFromAllFwdErr(),
        );

        router.post(
            '/refresh-token',
            this.apiLimiterMiddleware.middleware(ApiType.authApi),
            this.userController.refreshFwdErr(),
        );

        router.post(
            '/requestEmailValidation',
            this.apiLimiterMiddleware.middleware(ApiType.authApi),
            this.rolesMiddleware.middleware('readonly'),
            this.userController.requestEmailValidationFwdErr(),
        );

        router.post(
            '/logout',
            this.apiLimiterMiddleware.middleware(ApiType.authApi),
            this.rolesMiddleware.middleware('readonly'),
            this.userController.logoutFwdErr(),
        );

        router.get(
            '/confirmEmailValidation/:token',
            this.apiLimiterMiddleware.middleware(ApiType.coreApi),
            this.userController.confirmEmailValidationFwdErr(),
        );

        router.delete(
            '/:id',
            this.apiLimiterMiddleware.middleware(ApiType.coreApi),
            this.rolesMiddleware.middleware('readonly'),
            this.userController.deleteOneFwdErr(),
        );

        router.patch(
            '/:id',
            this.apiLimiterMiddleware.middleware(ApiType.coreApi),
            this.rolesMiddleware.middleware('readonly'),
            this.userController.updateOneFwdErr(),
        );

        router.get(
            '/:id',
            this.apiLimiterMiddleware.middleware(ApiType.coreApi),
            this.rolesMiddleware.middleware('readonly'),
            this.userController.findOneFwdErr(),
        );

        router.get(
            '/',
            this.apiLimiterMiddleware.middleware(ApiType.coreApi),
            this.rolesMiddleware.middleware('readonly'),
            this.userController.findAllFwdErr(),
        );

        router.post(
            '/forgot-password',
            this.apiLimiterMiddleware.middleware(ApiType.authApi),
            this.userController.requestPasswordRecoveryFwdErr(),
        );

        router.post(
            '/reset-password',
            this.apiLimiterMiddleware.middleware(ApiType.authApi),
            this.userController.resetPasswordFwdErr(),
        );

        return router;
    }
}
