import { Model } from "mongoose";
import { Router } from "express";

import { ConfigService } from "@root/services/config.service";
import { EmailService } from "@root/services/email.service";
import { HashingService } from "@root/services/hashing.service";
import { IUser } from "@root/interfaces/user/user.interface";
import { JwtService } from "@root/services/jwt.service";
import { LoggerService } from "@root/services/logger.service";
import { rolesMiddlewareFactory } from "@root/middlewares/roles.middleware";
import { SystemLoggerService } from "@root/services/system-logger.service";
import { UserController } from "@root/controllers/user.controller";
import { UserService } from "@root/services/user.service";

export class UserRoutes {

    constructor(
        private readonly configService: ConfigService,
        private readonly userModel: Model<IUser>,
        private readonly hashingService: HashingService,
        private readonly jwtService: JwtService,
        private readonly loggerService: LoggerService,
        private readonly emailService?: EmailService,
    ) {
        SystemLoggerService.info('User routes loaded');
    }

    get routes(): Router {
        const router = Router();
        const service = new UserService(
            this.configService,
            this.userModel,
            this.hashingService,
            this.jwtService,
            this.loggerService,
            this.emailService
        );

        const controller = new UserController(service, this.loggerService);
        const onlyAdminMiddleware = rolesMiddlewareFactory(
            'admin',
            this.userModel,
            this.loggerService,
            this.jwtService
        );

        router.post('/login', controller.login);
        router.get('/validate-email/:token', controller.validateEmail);

        router.post('/create', onlyAdminMiddleware, controller.create);
        router.get('/:id', onlyAdminMiddleware, controller.findOne);
        router.get('/', onlyAdminMiddleware, controller.findAll);
        router.delete('/:id', onlyAdminMiddleware, controller.deleteOne);
        router.patch('/:id', onlyAdminMiddleware, controller.updateOne);

        return router;
    }
}