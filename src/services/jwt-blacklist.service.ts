import { RedisService } from './redis.service';
import { JwtTypes } from 'src/enums/jwt-types.enum';
import { makeSessionTokenBlacklistKey } from 'src/common/logic/token/make-session-token-blacklist-key';
import { makeEmailValidationBlacklistKey } from 'src/common/logic/token/make-email-validation-token-blacklist-key';
import { makePasswordRecoveryTokenBlacklistKey } from 'src/common/logic/token/make-password-recovery-token-blacklist-key';

export class JwtBlackListService {
    constructor(private readonly redisService: RedisService) {}

    private resolveKey(jwtType: JwtTypes, jti: string): string {
        switch (jwtType) {
            case JwtTypes.session:
                return makeSessionTokenBlacklistKey(jti);
            case JwtTypes.emailValidation:
                return makeEmailValidationBlacklistKey(jti);
            case JwtTypes.passwordRecovery:
                return makePasswordRecoveryTokenBlacklistKey(jti);
            default:
                throw new Error(`Unknown JWT type: ${jwtType as string}`);
        }
    }

    async blacklist(
        jwtType: JwtTypes,
        jti: string,
        expirationTimeInSeconds: number,
    ): Promise<void> {
        const key = this.resolveKey(jwtType, jti);
        await this.redisService.set(key, '1', expirationTimeInSeconds);
    }

    async tokenInBlacklist(jwtType: JwtTypes, jti: string): Promise<boolean> {
        const key = await this.redisService.get(this.resolveKey(jwtType, jti));
        return !!key;
    }
}
