import { Model } from 'mongoose';
import { RedisService } from './redis.service';
import { LoggerService } from './logger.service';
import { isDataInCacheExpired } from 'src/functions/cache/is-data-expired-in-cache';
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

    async getPagination(
        offset: number,
        limit: number,
        options?: {
            find: Record<string, any>;
        },
    ): Promise<Data[]> {
        const base = options?.find ? this.model.find(options?.find) : this.model.find();
        const idsInData = await base
            .skip(offset)
            .limit(limit)
            .sort({ createdAt: 1, _id: 1 })
            .select('id')
            .exec();
        const ids = idsInData.map((d) => d._id.toString() as string);
        // Batch fetch from cache
        const cacheKeys = ids.map((id) => this.cacheKeyMaker(id));
        const cachedResults = await this.redisService.mget<DataInCache<Data>>(...cacheKeys);
        const results: Data[] = [];
        const missingIds: string[] = [];
        // Check cache and collect missing ids
        for (let i = 0; i < ids.length; i++) {
            const resourceInCache = cachedResults[i];
            if (resourceInCache) {
                const resourceExpired = isDataInCacheExpired(resourceInCache.cachedAtUnix, this.ttls);
                if (!resourceExpired) {
                    results[i] = resourceInCache.data;
                } else {
                    const expiredButFresh = await this.revalidate(ids[i], resourceInCache.cachedAtUnix);
                    if (expiredButFresh) {
                        await this.cache(resourceInCache.data);
                        results[i] = resourceInCache.data;
                    } else {
                        missingIds.push(ids[i]);
                    }
                }
            } else {
                missingIds.push(ids[i]);
            }
        }
        // Batch fetch missing items from DB
        if (missingIds.length > 0) {
            const missingDocs = await this.model.find({ _id: { $in: missingIds } }).exec();
            // Map for quick lookup
            const missingDocsMap = new Map<string, Data>();
            for (const doc of missingDocs) {
                missingDocsMap.set(doc._id.toString(), doc);
                await this.cache(doc);
            }
            // Fill in results in correct order
            for (let i = 0; i < ids.length; i++) {
                if (!results[i]) {
                    const doc = missingDocsMap.get(ids[i]);
                    results[i] = doc || null;
                }
            }
        }
        // Filter out any nulls (in case some ids not found in DB)
        return results.filter((item) => item !== null);
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
