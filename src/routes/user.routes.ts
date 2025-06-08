import { Model } from "mongoose";
import { Router } from "express";
import { ConfigService, HashingService, LoggerService, SystemLoggerService, UserService } from "@root/services";
import { createAdmin } from "@root/admin/create-admin";
import { IUser } from "@root/interfaces";
import { UserController } from "@root/controllers";
import { ApiLimiterMiddleware, AuthLimiterMiddleware, RolesMiddleware } from '@root/middlewares';
import { CreateUserValidator, LoginUserValidator, UpdateUserValidator } from '@root/validators/models/user';

export class UserRoutes {

    private readonly userController: UserController;

    constructor(
        private readonly userService: UserService,
        private readonly configService: ConfigService,
        private readonly userModel: Model<IUser>,
        private readonly hashingService: HashingService,
        private readonly loggerService: LoggerService,
        private readonly rolesMiddleware: RolesMiddleware,
        private readonly authLimiterMiddleware: AuthLimiterMiddleware,
        private readonly apiLimiterMiddleware: ApiLimiterMiddleware,
    ) {
        this.userController = new UserController(
            this.userService,
            this.loggerService,
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

        router.post('/register',
            this.authLimiterMiddleware.middleware(),
            this.userController.createFwdErr()
        );

        router.post('/login',
            this.authLimiterMiddleware.middleware(),
            this.userController.loginFwdErr()
        );

        router.post('/requestEmailValidation',
            this.authLimiterMiddleware.middleware(),
            this.rolesMiddleware.middleware('readonly'),
            this.userController.requestEmailValidationFwdErr()
        );

        router.post('/logout',
            this.authLimiterMiddleware.middleware(),
            this.rolesMiddleware.middleware('readonly'),
            this.userController.logoutFwdErr()
        );

        router.delete('/:id',
            this.apiLimiterMiddleware.middleware(),
            this.rolesMiddleware.middleware('readonly'),
            this.userController.deleteOneFwdErr()
        );

        router.patch('/:id',
            this.apiLimiterMiddleware.middleware(),
            this.rolesMiddleware.middleware('readonly'),
            this.userController.updateOneFwdErr()
        );

        router.get('/confirmEmailValidation/:token',
            this.apiLimiterMiddleware.middleware(),
            this.authLimiterMiddleware.middleware(),
            this.userController.confirmEmailValidationFwdErr()
        );

        router.get('/:id',
            this.apiLimiterMiddleware.middleware(),
            this.rolesMiddleware.middleware('readonly'),
            this.userController.findOneFwdErr()
        );

        router.get('/',
            this.apiLimiterMiddleware.middleware(),
            this.rolesMiddleware.middleware('readonly'),
            this.userController.findAllFwdErr()
        );

        return router;
    }
}