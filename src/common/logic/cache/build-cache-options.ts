import { ICacheOptions } from '@root/interfaces/cache/cache-options.interface';
import { Request } from 'express';

export function buildCacheOptions(req: Request): ICacheOptions {
    let noStore = false;

    const cacheControl = req.header('Cache-Control')
    if (cacheControl?.includes('no-store'))
        noStore = true;

    return { noStore }
}