export function isDataInCacheExpired(cachedAtUnix: number, ttls: number) {
    const resourceExpiresAtUnix = cachedAtUnix + ttls;
    const currentTimeUnix = Math.floor(Date.now() / 1000);
    return resourceExpiresAtUnix < currentTimeUnix;
}
