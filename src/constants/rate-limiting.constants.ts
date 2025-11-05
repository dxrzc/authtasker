import { RateLimiter } from 'src/enums/rate-limiter.enum';

export const rateLimiting = {
    [RateLimiter.critical]: {
        max: 100,
        windowMs: 1 * 60 * 1000,
    },
    [RateLimiter.relaxed]: {
        max: 1000,
        windowMs: 5 * 60 * 1000,
    },
};
