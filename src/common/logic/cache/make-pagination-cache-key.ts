import { Apis } from '@root/enums/apis.enum';

export const makePaginationCacheKey = (api: Apis, page: number, limit: number) => `pagination:${api}:${page}:${limit}`;