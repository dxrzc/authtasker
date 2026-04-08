import { AsyncLocalStorage } from 'async_hooks';
import { IAsyncLocalStorageStore } from 'src/interfaces/others/async-local-storage.interface';
import { RateLimiterMiddleware } from 'src/middlewares/rate-limiter.middleware';
import { RequestContextMiddleware } from 'src/middlewares/request-context.middleware';
import { RolesMiddleware } from 'src/middlewares/roles.middleware';
import { ConfigService } from 'src/services/config.service';
import { LoggerService } from 'src/services/logger.service';
import { buildServices } from './services.factory';
import Redis from 'ioredis';
import { ValidateIdMiddleware } from 'src/middlewares/validate-id.middleware';
import { AuthMiddleware } from 'src/middlewares/auth.middleware';

export function buildMiddlewares(
    configService: ConfigService,
    loggerService: LoggerService,
    asyncLocalStorage: AsyncLocalStorage<IAsyncLocalStorageStore>,
    services: ReturnType<typeof buildServices>,
    redisClient: Redis,
) {
    const rateLimiterMiddleware = new RateLimiterMiddleware(
        loggerService,
        redisClient,
        configService,
    );
    const authMiddleware = new AuthMiddleware(services.sessionTokenService, loggerService);
    const rolesMiddleware = new RolesMiddleware(loggerService);
    const requestContextMiddleware = new RequestContextMiddleware(asyncLocalStorage, loggerService);
    const validateIdMiddleware = new ValidateIdMiddleware(loggerService);
    return {
        authMiddleware,
        rateLimiterMiddleware,
        rolesMiddleware,
        requestContextMiddleware,
        validateIdMiddleware,
    };
}
