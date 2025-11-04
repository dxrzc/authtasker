import { Apis } from 'src/enums/apis.enum';

export const makePaginationCacheKey = (api: Apis, page: number, limit: number) =>
    `pagination:${api}:${page}:${limit}`;
