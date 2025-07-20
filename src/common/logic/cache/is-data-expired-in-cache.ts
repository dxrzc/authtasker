
export function isDataInCacheExpired(cachedAtUnix: number, ttlSeconds: number) {
    const resourceExpiresAtUnix = cachedAtUnix + ttlSeconds;
    const currentTimeUnix = Math.floor(Date.now() / 1000);    
    return resourceExpiresAtUnix < currentTimeUnix;
}