import { Router } from "express";
import { Model } from "mongoose";
import { ApiType } from '@root/enums/api-type.enum';
import { createAdmin } from '@root/admin/create-admin';
import { UserService } from '@root/services/user.service';
import { IUser } from '@root/interfaces/user/user.interface';
import { ConfigService } from '@root/services/config.service';
import { LoggerService } from '@root/services/logger.service';
import { HashingService } from '@root/services/hashing.service';
import { UserController } from '@root/controllers/user.controller';
import { RolesMiddleware } from '@root/middlewares/roles.middleware';
import { SystemLoggerService } from '@root/services/system-logger.service';
import { ApiLimiterMiddleware } from '@root/middlewares/api-limiter.middleware';
import { LoginUserValidator } from '@root/validators/models/user/login-user.validator';
import { UpdateUserValidator } from '@root/validators/models/user/update-user.validator';
import { CreateUserValidator } from '@root/validators/models/user/create-user.validator';

export class UserRoutes {

    private readonly userController: UserController;

    constructor(
        private readonly userService: UserService,
        private readonly configService: ConfigService,
        private readonly userModel: Model<IUser>,
        private readonly hashingService: HashingService,
        private readonly loggerService: LoggerService,
        private readonly rolesMiddleware: RolesMiddleware,        
        private readonly apiLimiterMiddleware: ApiLimiterMiddleware,
    ) {
        this.userController = new UserController(
            this.userService,
            new CreateUserValidator(),
            new UpdateUserValidator(),
            new LoginUserValidator(),
        );

        SystemLoggerService.info('User routes loaded');
    }

    private async initialData() {
        await createAdmin(
            this.userModel,
            this.configService,
            this.hashingService
        );
    }

    async build(): Promise<Router> {
        await this.initialData();

        const router = Router();

        router.get('/me',
            this.apiLimiterMiddleware.middleware(ApiType.coreApi),
            this.rolesMiddleware.middleware('readonly'),
            this.userController.meFwdErr()
        );

        router.post('/register',
            this.apiLimiterMiddleware.middleware(ApiType.authApi),
            this.userController.createFwdErr()
        );

        router.post('/login',
            this.apiLimiterMiddleware.middleware(ApiType.authApi),
            this.userController.loginFwdErr()
        );

        router.post('/refresh-token',
            this.apiLimiterMiddleware.middleware(ApiType.authApi),
            this.userController.refreshFwdErr()
        );

        router.post('/requestEmailValidation',
            this.apiLimiterMiddleware.middleware(ApiType.authApi),
            this.rolesMiddleware.middleware('readonly'),
            this.userController.requestEmailValidationFwdErr()
        );

        router.post('/logout',
            this.apiLimiterMiddleware.middleware(ApiType.authApi),
            this.rolesMiddleware.middleware('readonly'),
            this.userController.logoutFwdErr()
        );

        router.get('/confirmEmailValidation/:token',
            this.apiLimiterMiddleware.middleware(ApiType.coreApi),
            this.userController.confirmEmailValidationFwdErr()
        );

        router.delete('/:id',
            this.apiLimiterMiddleware.middleware(ApiType.coreApi),
            this.rolesMiddleware.middleware('readonly'),
            this.userController.deleteOneFwdErr()
        );

        router.patch('/:id',
            this.apiLimiterMiddleware.middleware(ApiType.coreApi),
            this.rolesMiddleware.middleware('readonly'),
            this.userController.updateOneFwdErr()
        );

        router.get('/:id',
            this.apiLimiterMiddleware.middleware(ApiType.coreApi),
            this.rolesMiddleware.middleware('readonly'),
            this.userController.findOneFwdErr()
        );

        router.get('/',
            this.apiLimiterMiddleware.middleware(ApiType.coreApi),
            this.rolesMiddleware.middleware('readonly'),
            this.userController.findAllFwdErr()
        );

        return router;
    }
}