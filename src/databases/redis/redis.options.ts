import { RedisOptions } from 'ioredis';

// makes sure we use the same redis options for suscriber and publisher
export function getRedisOptions(): RedisOptions {
    return {
        lazyConnect: true,             
        db: 0,
        // disable reconnection
        retryStrategy: null as any, 
    };
}