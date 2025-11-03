import { Apis } from 'src/enums/apis.enum';
import { RedisService } from './redis.service';
import { ConfigService } from './config.service';
import { LoggerService } from './logger.service';
import { makePaginationCacheKey } from 'src/common/logic/cache/make-pagination-cache-key';

export class PaginationCacheService {
    constructor(
        private readonly loggerService: LoggerService,
        private readonly redisService: RedisService,
        private readonly configService: ConfigService,
    ) {}

    async cacheWithKey(key: string, data: object) {
        await this.redisService.set(key, data, this.configService.PAGINATION_CACHE_TTLS_SECONDS);
        this.loggerService.info(`Pagination ${key} cached`);
    }

    async cache(api: Apis, page: number, limit: number, data: object): Promise<void> {
        await this.redisService.set(
            makePaginationCacheKey(api, page, limit),
            data,
            this.configService.PAGINATION_CACHE_TTLS_SECONDS,
        );
        this.loggerService.info(`Pagination of ${api} data page=${page} limit=${limit} cached`);
    }

    async get<T>(api: Apis, page: number, limit: number): Promise<T | null> {
        const dataInCache = await this.redisService.get<T>(
            makePaginationCacheKey(api, page, limit),
        );
        if (dataInCache) {
            this.loggerService.info(`Cache hit for ${api} pagination page=${page} limit=${limit}`);
            return dataInCache;
        }
        this.loggerService.info('No data in cache');
        return null;
    }

    async getWithKey<T>(key: string) {
        const dataInCache = await this.redisService.get<T>(key);
        if (dataInCache) {
            this.loggerService.info(`Cache hit for ${key}`);
            return dataInCache;
        }
        this.loggerService.info('No data in cache');
        return null;
    }
}
