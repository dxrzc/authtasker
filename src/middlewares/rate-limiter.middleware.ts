import rateLimit from 'express-rate-limit';
import { rateLimiting } from 'src/constants/rate-limiting.constants';
import { RateLimiter } from 'src/enums/rate-limiter.enum';
import { commonErrors } from 'src/messages/common.error.messages';
import { LoggerService } from 'src/services/logger.service';

export class RateLimiterMiddleware {
    constructor(private readonly loggerService: LoggerService) {}

    middleware(type: RateLimiter) {
        const settings = rateLimiting[type];

        // TODO: use a redis store

        return rateLimit({
            message: () => {
                this.loggerService.error(
                    `Rate limit exceeded for ${settings.max} requests per ${settings.windowMs / 1000} seconds`,
                );
                return { error: commonErrors.TOO_MANY_REQUESTS };
            },
            standardHeaders: false,
            legacyHeaders: false,
            ...settings,
        });
    }
}
