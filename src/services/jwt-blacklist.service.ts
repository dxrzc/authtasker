import { makeEmailValidationBlacklistKey, makeSessionTokenBlacklistKey } from '@logic/token';
import { RedisService } from './redis.service';
import { JwtTypes } from '@root/enums';

export class JwtBlackListService {

    constructor(
        private readonly redisService: RedisService,
    ) {}

    private resolveKey(jwtType: JwtTypes, jti: string): string {
        switch (jwtType) {
            case JwtTypes.session: return makeSessionTokenBlacklistKey(jti);
            case JwtTypes.emailValidation: return makeEmailValidationBlacklistKey(jti);
            default: throw new Error(`Unknown JWT type: ${jwtType}`);
        }
    }

    async blacklist(jwtType: JwtTypes, jti: string, expirationTimeInSeconds: number): Promise<void> {
        const key = this.resolveKey(jwtType, jti);
        await this.redisService.set(key, '1', expirationTimeInSeconds);
    }

    async tokenInBlacklist(jwtType: JwtTypes, jti: string): Promise<boolean> {
        const key = await this.redisService.get(this.resolveKey(jwtType, jti));
        return !!key;
    }
}