import { ConfigService } from '@root/services/config.service';

// makes sure we use the same redis options for suscriber and publisher
export function getRedisOptions(configService: ConfigService) {
    return {
        lazyConnect: true,
        port: configService.REDIS_PORT,
        host: configService.REDIS_HOST,
        password: configService.REDIS_PASSWORD,
        db: 0,
        // disable reconnects
        retryStrategy: null as any, 
    };
}