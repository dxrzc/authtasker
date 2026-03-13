import { Model } from 'mongoose';
import { CacheService } from './cache.service';
import { LoggerService } from './logger.service';
import { Apis } from 'src/enums/apis.enum';

export class PaginationService<Data extends { id: string }> {
    constructor(
        private readonly cacheService: CacheService<Data>,
        private readonly model: Model<any>,
        private readonly loggerService: LoggerService,
        private readonly apiName: Apis,
    ) {}

    /**
     * @returns the IDs for a specific page based on offset and limit
     */
    private async getPageIds(
        offset: number,
        limit: number,
        findOptions?: Record<string, unknown>,
    ): Promise<string[]> {
        const base = findOptions ? this.model.find(findOptions) : this.model.find();
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
     * @returns a map of missing IDs to their corresponding Data fetched from the database
     */
    private async fetchMissingIdsFromDb(missingIds: string[]): Promise<Map<string, Data>> {
        const missingDocs = await this.model.find({ _id: { $in: missingIds } }).exec();
        // Map for quick lookup
        const missingDocsMap = new Map<string, Data>();
        for (const doc of missingDocs) {
            missingDocsMap.set(doc._id.toString(), doc);
            await this.cacheService.cache(doc);
        }
        return missingDocsMap;
    }

    /**
     * @returns results array with a null for missing IDs and an array of missing IDs
     */
    private async checkCacheAndCollectMissingIds(
        paginationIds: string[],
    ): Promise<{ results: Array<Data | null>; missingIds: string[] }> {
        const cachedResults = await this.cacheService.getMultiple(paginationIds);
        const results: (Data | null)[] = [];
        const missingIds: string[] = [];
        // Check cache and collect missing ids
        for (let i = 0; i < paginationIds.length; i++) {
            const resourceInCache = cachedResults[i];
            if (resourceInCache) {
                const resourceExpired = this.cacheService.isDataExpired(
                    resourceInCache.cachedAtUnix,
                );
                if (!resourceExpired) {
                    results[i] = resourceInCache.data;
                    this.loggerService.info(
                        `Cache hit for ${this.apiName} with id ${paginationIds[i]}`,
                    );
                } else {
                    // revalidation logic
                    const expiredButFresh = await this.cacheService.revalidate(
                        paginationIds[i],
                        resourceInCache.cachedAtUnix,
                    );
                    if (expiredButFresh) {
                        await this.cacheService.cache(resourceInCache.data);
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

    async get(
        offset: number,
        limit: number,
        findOptions?: Record<string, unknown>,
    ): Promise<Data[]> {
        const ids = await this.getPageIds(offset, limit, findOptions);
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
}
