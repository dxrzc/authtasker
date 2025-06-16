import { Model } from 'mongoose';
import { RedisService } from './redis.service';
import { LoggerService } from './logger.service';
import { IUser } from '@root/interfaces/user/user.interface';
import { UserResponse } from '@root/types/user/user-response.type';
import { makeUsersCacheKey } from '@logic/cache/make-users-cache-key';
import { isDataInCacheExpired } from '@logic/cache/is-data-expired-in-cache';
import { DataInCache } from '@root/interfaces/cache/data-in-cache.interface';

type UserInCache = DataInCache<UserResponse>;

export class UsersCacheService {
    constructor(
        private readonly userModel: Model<IUser>,
        private readonly loggerService: LoggerService,
        private readonly redisService: RedisService,
        private readonly ttls: number
    ) {}

    private async revalidate(userId: string, cachedAtUnix: number): Promise<boolean> {
        const userInDb = await this.userModel
            .findById(userId)
            .select('updatedAt')
            .exec();
        // user deleted
        if (!userInDb) return false;
        const updatedAtUnix = Math.floor((userInDb.updatedAt.getTime()) / 1000);
        return cachedAtUnix > updatedAtUnix;
    }

    async get(userId: string): Promise<UserResponse | null> {
        const userInCache = await this.redisService.get<UserInCache>(makeUsersCacheKey(userId));
        // first time
        if (!userInCache) {
            this.loggerService.info(`User ${userId} not found in cache`);
            return null;
        }
        const userExpiredInCache = await isDataInCacheExpired(userInCache.cachedAtUnix, this.ttls);
        // hit
        if (!userExpiredInCache) {
            this.loggerService.info('Cache hit');
            return userInCache.data;
        }
        const expiredButFresh = await this.revalidate(userId, userInCache.cachedAtUnix);
        // revalidate-hit
        if (expiredButFresh) {
            this.loggerService.info('Cache revalidate-hit');
            await this.cache(userInCache.data);
            return userInCache.data;
        }
        // revalidate-miss
        this.loggerService.info('Cache revalidate-miss');
        return null;
    }

    async cache(data: UserResponse): Promise<void> {
        const userID = data.id;
        const dataInDB: UserInCache = {
            cachedAtUnix: Math.floor(Date.now() / 1000),
            data: data,            
        };
        await this.redisService.set(makeUsersCacheKey(userID), dataInDB);
    }
}