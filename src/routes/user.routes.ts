import { Model } from "mongoose";
import { Router } from "express";
import { ConfigService, HashingService, LoggerService, UserService } from "@root/services";
import { RequestLimiterMiddlewares, RolesMiddlewares } from "@root/types/middlewares";
import { IUser } from "@root/interfaces/user/user.interface";
import { SystemLoggerService } from "@root/services/system-logger.service";
import { UserController } from "@root/controllers/user.controller";
import { createAdmin } from "@root/admin/create-admin";

export class UserRoutes {

    private readonly userController: UserController;

    constructor(
        private readonly userService: UserService,
        private readonly configService: ConfigService,
        private readonly userModel: Model<IUser>,
        private readonly hashingService: HashingService,
        private readonly loggerService: LoggerService,
        private readonly rolesMiddlewares: RolesMiddlewares,
        private readonly requestLimiterMiddlewares: RequestLimiterMiddlewares,
    ) {
        this.userController = new UserController(
            this.userService,
            this.loggerService
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

        router.post(
            '/create',
            this.requestLimiterMiddlewares.authLimiter,
            this.userController.create
        );

        router.post(
            '/login',
            this.requestLimiterMiddlewares.authLimiter,
            this.userController.login
        );

        router.post(
            '/requestEmailValidation',
            this.requestLimiterMiddlewares.authLimiter,
            this.rolesMiddlewares.readonly,
            this.userController.requestEmailValidation
        );

        router.post(
            '/logout',
            this.requestLimiterMiddlewares.authLimiter,
            this.rolesMiddlewares.readonly,
            this.userController.logout
        );

        router.delete(
            '/:id',
            this.requestLimiterMiddlewares.apiLimiter,
            this.rolesMiddlewares.readonly,
            this.userController.deleteOne
        );

        router.patch(
            '/:id',
            this.requestLimiterMiddlewares.apiLimiter,
            this.rolesMiddlewares.readonly,
            this.userController.updateOne
        );

        router.get(
            '/confirmEmailValidation/:token',
            this.requestLimiterMiddlewares.apiLimiter,
            this.requestLimiterMiddlewares.authLimiter,
            this.userController.confirmEmailValidation
        );

        router.get(
            '/:id',
            this.requestLimiterMiddlewares.apiLimiter,
            this.rolesMiddlewares.readonly,
            this.userController.findOne
        );

        router.get(
            '/',
            this.requestLimiterMiddlewares.apiLimiter,
            this.rolesMiddlewares.readonly,
            this.userController.findAll
        );

        return router;
    }
}