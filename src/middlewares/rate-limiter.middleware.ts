import rateLimit from 'express-rate-limit';
import type { Request } from 'express';
import Redis from 'ioredis';
import { RedisStore, type RedisReply } from 'rate-limit-redis';
import { rateLimiting } from 'src/constants/rate-limiting.constants';
import { RateLimiter } from 'src/enums/rate-limiter.enum';
import { commonErrors } from 'src/messages/common.error.messages';
import { ConfigService } from 'src/services/config.service';
import { LoggerService } from 'src/services/logger.service';

export class RateLimiterMiddleware {
    constructor(
        private readonly loggerService: LoggerService,
        private readonly redisClient: Redis,
        private readonly configService: ConfigService,
    ) {}

    middleware(type: RateLimiter) {
        const settings = rateLimiting[type];

        return rateLimit({
            keyGenerator: (req: Request) => this.buildKey(req),
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

    private buildKey(req: Request): string {
        const endpoint = `${req.method}:${req.baseUrl}${req.path}`;
        const userId = (req as Request & { id?: string }).id ?? req.ip ?? 'anonymous';
        return `${userId}:${endpoint}`;
    }
}
