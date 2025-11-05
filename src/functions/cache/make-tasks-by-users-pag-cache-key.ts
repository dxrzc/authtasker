export const makeTasksByUserPaginationCacheKey = (userId: string, page: number, limit: number) =>
    `pagination:${userId}:tasks:${page}:${limit}`;
