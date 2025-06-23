import { StringValue } from 'ms';
import { JwtService } from './jwt.service';
import { ConfigService } from './config.service';
import { LoggerService } from './logger.service';
import { RedisService } from './redis.service';
import { makeRefreshTokenKey } from '@logic/token/make-refresh-token-key';
import { convertExpTimeToUniux } from '@logic/token/convert-exp-time-to-unix';

export class RefreshTokenService {

    constructor(
        private readonly configService: ConfigService,
        private readonly jwtService: JwtService,
        private readonly loggerService: LoggerService,
        private readonly redisService: RedisService,
    ) {}

    private async storeJtiInDB(jti: string): Promise<void> {
        const expTimeUnix = convertExpTimeToUniux(this.configService.JWT_REFRESH_EXP_TIME as StringValue);
        await this.redisService.set(makeRefreshTokenKey(jti), '1', expTimeUnix);
    }

    async generate(userId: string): Promise<string> {
        const expTime = this.configService.JWT_REFRESH_EXP_TIME;
        const { token, jti } = this.jwtService.generate(expTime, {
            // purpose???
            id: userId
        });
        await this.storeJtiInDB(jti);
        this.loggerService.info(`Refresh token ${jti} generated, expires at ${expTime}`);
        return token;
    }
}