import { Model } from 'mongoose';
import { RedisService } from './redis.service';
import { LoggerService } from './logger.service';
import { isDataInCacheExpired } from 'src/functions/cache/is-data-expired-in-cache';
import { DataInCache } from 'src/interfaces/cache/data-in-cache.interface';
import { Apis } from 'src/enums/apis.enum';

export class CacheService<Data extends { id: string }> {
    constructor(
        private readonly model: Model<any>,
        private readonly loggerService: LoggerService,
        private readonly redisService: RedisService,
        private readonly ttls: number,
        private readonly hardTtls: number,
        private readonly cacheKeyMaker: (id: string) => string,
        private readonly apiName: Apis,
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
    }

    /**
     * @returns the IDs for a specific page based on offset and limit
     */
    private async getPageIds(
        offset: number,
        limit: number,
        options?: { find: Record<string, any> },
    ): Promise<string[]> {
        const base = options?.find ? this.model.find(options?.find) : this.model.find();
        const idsInData = await base
            .skip(offset)
            .limit(limit)
            .sort({ createdAt: 1, _id: 1 })
            .select('id')
            .exec();
        const ids = idsInData.map((d) => d._id.toString() as string);
        return ids;
    }

    /**
     * @returns results array with a null for missing IDs and an array of missing IDs
     */
    private async checkCacheAndCollectMissingIds(
        paginationIds: string[],
    ): Promise<{ results: Array<Data | null>; missingIds: string[] }> {
        const cacheKeys = paginationIds.map((id) => this.cacheKeyMaker(id));
        const cachedResults = await this.redisService.mget<DataInCache<Data>>(cacheKeys);
        const results: (Data | null)[] = [];
        const missingIds: string[] = [];
        // Check cache and collect missing ids
        for (let i = 0; i < paginationIds.length; i++) {
            const resourceInCache = cachedResults[i];
            if (resourceInCache) {
                const resourceExpired = isDataInCacheExpired(
                    resourceInCache.cachedAtUnix,
                    this.ttls,
                );
                if (!resourceExpired) {
                    results[i] = resourceInCache.data;
                    this.loggerService.info(
                        `Cache hit for ${this.apiName} with id ${paginationIds[i]}`,
                    );
                } else {
                    // revalidation logic
                    const expiredButFresh = await this.revalidate(
                        paginationIds[i],
                        resourceInCache.cachedAtUnix,
                    );
                    if (expiredButFresh) {
                        await this.cache(resourceInCache.data);
                        results[i] = resourceInCache.data;
                        this.loggerService.info(
                            `Cache revalidate-hit for ${this.apiName} with id ${paginationIds[i]}`,
                        );
                    } else {
                        missingIds.push(paginationIds[i]);
                        this.loggerService.info(
                            `Cache revalidate-miss for ${this.apiName} with id ${paginationIds[i]}`,
                        );
                    }
                }
            } else {
                missingIds.push(paginationIds[i]);
                this.loggerService.info(
                    `No data in cache for ${this.apiName} with id ${paginationIds[i]}`,
                );
            }
        }
        return { results, missingIds };
    }

    /**
     * @returns a map of missing IDs to their corresponding Data fetched from the database
     */
    async fetchMissingIdsFromDb(missingIds: string[]): Promise<Map<string, Data>> {
        const missingDocs = await this.model.find({ _id: { $in: missingIds } }).exec();
        // Map for quick lookup
        const missingDocsMap = new Map<string, Data>();
        for (const doc of missingDocs) {
            missingDocsMap.set(doc._id.toString(), doc);
            await this.cache(doc);
        }
        return missingDocsMap;
    }

    async getPagination(
        offset: number,
        limit: number,
        options?: {
            find: Record<string, any>;
        },
    ): Promise<Data[]> {
        const ids = await this.getPageIds(offset, limit, options);
        if (ids.length === 0) {
            return [];
        }
        const { results, missingIds } = await this.checkCacheAndCollectMissingIds(ids);
        // Batch fetch missing items from DB
        if (missingIds.length > 0) {
            const missingDocsMap = await this.fetchMissingIdsFromDb(missingIds);
            // fill in results in correct order
            for (let i = 0; i < ids.length; i++) {
                if (!results[i]) {
                    const doc = missingDocsMap.get(ids[i]);
                    results[i] = doc || null;
                }
            }
        }
        // in case some ids not found in DB
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

    async delete(id: string): Promise<void> {
        const cacheKey = this.cacheKeyMaker(id);
        await this.redisService.del(cacheKey);
    }
}
