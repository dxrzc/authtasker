import { RateLimiter } from 'src/enums/rate-limiter.enum';

export const rateLimitingSettings = {
    [RateLimiter.critical]: {
        max: 3,
        windowMs: 1 * 60 * 1000, // 1 minute
    },
    [RateLimiter.relaxed]: {
        max: 100,
        windowMs: 5 * 60 * 1000, // 5 minutes
    },
} as const;
