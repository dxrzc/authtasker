import rateLimit from 'express-rate-limit';
import { rateLimiting } from 'src/constants/rate-limiting.constants';
import { RateLimiter } from 'src/enums/rate-limiter.enum';
import { commonErrors } from 'src/messages/common.error.messages';
import { LoggerService } from 'src/services/logger.service';
import { RedisStore, type RedisReply } from 'rate-limit-redis';
import Redis from 'ioredis';
import { ConfigService } from 'src/services/config.service';

export class RateLimiterMiddleware {
    constructor(
        private readonly loggerService: LoggerService,
        private readonly redisClient: Redis,
        private readonly configService: ConfigService,
    ) {}

    middleware(type: RateLimiter) {
        const settings = rateLimiting[type];

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
            store:
                this.configService.NODE_ENV === 'integration'
                    ? undefined
                    : new RedisStore({
                          sendCommand: (command: string, ...args: string[]) =>
                              this.redisClient.call(command, ...args) as Promise<RedisReply>,
                      }),
        });
    }
}
