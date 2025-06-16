
export async function isDataInCacheExpired(resourceCachedAtUnix: number, resourceTttlSeconds: number): Promise<boolean> {
    const resourceExpiresAtUnix = resourceCachedAtUnix + resourceTttlSeconds;
    const currentTimeUnix = Math.floor(Date.now() / 1000);
    return resourceExpiresAtUnix < currentTimeUnix;
}