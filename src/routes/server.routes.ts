import { ConfigService } from "@root/services/config.service";
import { EmailService } from "@root/services/email.service";
import { HashingService } from "@root/services/hashing.service";
import { JwtService } from "@root/services/jwt.service";
import { Router } from "express";
import { UserRoutes } from "./user.routes";
import { UserModel } from "@root/databases/mongo/schemas/user.schema";

// TODO: import dinamically
import { SeedRoutes } from "@root/seed/routes/seed.routes";

import { HttpLoggerService } from "@root/services/http-logger.service";
import { requestContextMiddlewareFactory } from "@root/middlewares/common/request-context.middleware";
import { AsyncLocalStorage } from "async_hooks";
import { AsyncLocalStorageStore } from "@root/types/common/asyncLocalStorage.type";

export class AppRoutes {

    constructor(
        private readonly configService: ConfigService,
        private readonly asyncLocalStorage: AsyncLocalStorage<AsyncLocalStorageStore>
    ) {}

    get routes(): Router {
        // common services

        let emailService: EmailService | undefined;
        if (this.configService.mailServiceIsDefined()) {
            emailService = new EmailService({
                host: this.configService.MAIL_SERVICE_HOST,
                port: this.configService.MAIL_SERVICE_PORT,
                user: this.configService.MAIL_SERVICE_USER,
                pass: this.configService.MAIL_SERVICE_PASS,
            });
        }

        const jwtService = new JwtService(
            this.configService.JWT_EXPIRATION_TIME,
            this.configService.JWT_PRIVATE_KEY
        );

        const hashingService = new HashingService(
            this.configService.BCRYPT_SALT_ROUNDS
        );

        const loggerService = new HttpLoggerService(
            this.configService,
            this.asyncLocalStorage
        );

        const userRoutes = new UserRoutes(
            this.configService,
            UserModel,
            hashingService,
            jwtService,
            loggerService,
            emailService,
        );

        const router = Router();

        // global middlewares
        router.use(requestContextMiddlewareFactory(this.asyncLocalStorage));

        // apis
        router.use('/api/users', userRoutes.routes);

        if (this.configService.NODE_ENV != 'production') {
            const seedRoutes = new SeedRoutes(
                UserModel,
                hashingService
            );
            router.use('/api/seed', seedRoutes.routes);
        }

        return router;
    }
}