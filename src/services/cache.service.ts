import { Model } from 'mongoose';
import { RedisService } from './redis.service';
import { LoggerService } from './logger.service';
import { isDataInCacheExpired } from 'src/common/logic/cache/is-data-expired-in-cache';
import { DataInCache } from 'src/interfaces/cache/data-in-cache.interface';

export class CacheService<Data extends { id: string }> {
    constructor(
        private readonly model: Model<any>,
        private readonly loggerService: LoggerService,
        private readonly redisService: RedisService,
        private readonly ttls: number,
        private readonly hardTtls: number,
        private readonly cacheKeyMaker: (id: string) => string,
    ) {}

    private async revalidate(id: string, cachedAtUnix: number): Promise<boolean> {
        const query = await this.model.findById(id).select('updatedAt').exec();
        // resource not found
        if (!query) return false;
        const updatedAtUnix = Math.floor(query.updatedAt.getTime() / 1000);
        return cachedAtUnix > updatedAtUnix;
    }

    async get(id: string): Promise<Data | null> {
        const resourceInCache = await this.redisService.get<DataInCache<Data>>(
            this.cacheKeyMaker(id),
        );
        // first time
        if (!resourceInCache) {
            this.loggerService.info(`No data in cache`);
            return null;
        }
        const resourceExpired = isDataInCacheExpired(resourceInCache.cachedAtUnix, this.ttls);
        // hit
        if (!resourceExpired) {
            this.loggerService.info('Cache hit');
            return resourceInCache.data;
        }
        const expiredButFresh = await this.revalidate(id, resourceInCache.cachedAtUnix);
        // revalidate-hit
        if (expiredButFresh) {
            this.loggerService.info('Cache revalidate-hit');
            await this.cache(resourceInCache.data);
            return resourceInCache.data;
        }
        // revalidate-miss
        this.loggerService.info('Cache revalidate-miss');
        return null;
    }

    async cache(data: Data): Promise<void> {
        const resourceID = data.id;
        const dataInDB: DataInCache<Data> = {
            cachedAtUnix: Math.floor(Date.now() / 1000),
            data: data,
        };
        await this.redisService.set(this.cacheKeyMaker(resourceID), dataInDB, this.hardTtls);
    }
}
