import { Model } from 'mongoose';
import { RedisService } from './redis.service';
import { LoggerService } from './logger.service';
import { DataInCache } from 'src/interfaces/cache/data-in-cache.interface';
import { Apis } from 'src/enums/apis.enum';
import { SystemLoggerService } from './system-logger.service';
import Redis from 'ioredis';
import { isDataInCacheExpired } from 'src/functions/cache/is-data-expired-in-cache';

export class CacheService<Data extends { id: string }> {
    private readonly redisService: RedisService;

    constructor(
        private readonly model: Model<any>,
        private readonly loggerService: LoggerService,
        private readonly redisClient: Redis,
        private readonly ttls: number,
        private readonly hardTtls: number,
        private readonly cacheKeyMaker: (id: string) => string,
        private readonly apiName: Apis,
    ) {
        // this new instance is necessary for tests related to cache failures
        // (this way mocking this instance does not affect the other ones)
        this.redisService = new RedisService(redisClient);
    }

    isDataExpired(cachedAtUnix: number) {
        return isDataInCacheExpired(cachedAtUnix, this.ttls);
    }

    async getMultiple(ids: string[]): Promise<(DataInCache<Data> | null)[]> {
        const cacheKeys = ids.map((id) => this.cacheKeyMaker(id));
        return await this.redisService.mget<DataInCache<Data>>(cacheKeys);
    }

    async revalidate(id: string, cachedAtUnix: number): Promise<boolean> {
        const query = await this.model.findById(id).select('updatedAt').exec();
        // resource not found
        if (!query) return false;
        const updatedAtUnix = Math.floor(query.updatedAt.getTime() / 1000);
        return cachedAtUnix > updatedAtUnix;
    }

    async get(id: string): Promise<Data | null> {
        try {
            const resourceInCache = await this.redisService.get<DataInCache<Data>>(
                this.cacheKeyMaker(id),
            );
            // first time
            if (!resourceInCache) {
                this.loggerService.info(`No data in cache for ${this.apiName} with id ${id}`);
                return null;
            }
            const resourceExpired = isDataInCacheExpired(resourceInCache.cachedAtUnix, this.ttls);
            // hit
            if (!resourceExpired) {
                this.loggerService.info(`Cache hit for ${this.apiName} with id ${id}`);
                return resourceInCache.data;
            }
            const expiredButFresh = await this.revalidate(id, resourceInCache.cachedAtUnix);
            // revalidate-hit
            if (expiredButFresh) {
                this.loggerService.info(`Cache revalidate-hit for ${this.apiName} with id ${id}`);
                await this.cache(resourceInCache.data);
                return resourceInCache.data;
            }
            // revalidate-miss
            this.loggerService.info(`Cache revalidate-miss for ${this.apiName} with id ${id}`);
            return null;
        } catch (error) {
            this.loggerService.warn('Failed to get data from cache');
            SystemLoggerService.error(String(error));
            return null;
        }
    }

    async cache(data: Data): Promise<void> {
        try {
            const resourceID = data.id;
            const dataInDB: DataInCache<Data> = {
                cachedAtUnix: Math.floor(Date.now() / 1000),
                data: data,
            };
            await this.redisService.set(this.cacheKeyMaker(resourceID), dataInDB, this.hardTtls);
        } catch (error) {
            this.loggerService.warn('Failed to save data in cache');
            SystemLoggerService.error(String(error));
        }
    }

    async delete(id: string): Promise<void> {
        try {
            const cacheKey = this.cacheKeyMaker(id);
            await this.redisService.delete(cacheKey);
        } catch (error) {
            this.loggerService.warn('Failed to delete data from cache');
            SystemLoggerService.error(String(error));
        }
    }
}
