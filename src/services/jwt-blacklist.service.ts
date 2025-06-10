import { makeSessionTokenBlacklistKey } from '@logic/token';
import { RedisService } from './redis.service';

export class JwtBlackListService {

    constructor(
        private readonly redisService: RedisService,
    ) {}

    async blacklist(jti: string, expirationTime: number): Promise<void> {
        await this.redisService.set(makeSessionTokenBlacklistKey(jti), '1', expirationTime);
    }

    async isBlacklisted(jti: string): Promise<boolean> {
        const exists = await this.redisService.get<string>(makeSessionTokenBlacklistKey(jti));
        return !!exists;
    }
}