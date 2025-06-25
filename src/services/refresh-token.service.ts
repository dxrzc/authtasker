import { Model } from 'mongoose';
import { StringValue } from 'ms';
import { JwtService } from './jwt.service';
import { RedisService } from './redis.service';
import { ConfigService } from './config.service';
import { LoggerService } from './logger.service';
import { IUser } from '@root/interfaces/user/user.interface';
import { calculateTokenTTL } from '@logic/token/calculate-token-ttl';
import { HttpError } from '@root/common/errors/classes/http-error.class';
import { makeRefreshTokenKey } from '@logic/token/make-refresh-token-key';
import { authErrors } from '@root/common/errors/messages/auth.error.messages';
import { convertExpTimeToSeconds } from '@logic/token/convert-exp-time-to-unix';

interface RefreshTokenMetadata {
    token: string;
    jti: string;
    id: string;
    expSeconds: number;
};

export class RefreshTokenService {

    constructor(
        private readonly configService: ConfigService,
        private readonly jwtService: JwtService,
        private readonly loggerService: LoggerService,
        private readonly redisService: RedisService,
        private readonly userModel: Model<IUser>
    ) {}

    private async deleteToken(userId: string, jti: string): Promise<void> {
        await Promise.all([
            this.redisService.delete(makeRefreshTokenKey(userId, jti)),            
        ]);
    }

    private async storeToken(userId: string, jti: string, expiresInSeconds: number): Promise<void> {
        await Promise.all([
            this.redisService.set(makeRefreshTokenKey(userId, jti), '1', expiresInSeconds),            
        ]);
    }

    private generateToken(userId: string, expiresIn: string | number): { token: string, jti: string } {
        const expTime = (typeof expiresIn === 'number') ? `${expiresIn}s` : expiresIn;
        return this.jwtService.generate(expTime, {
            id: userId
        });
    }

    private async replaceRefreshToken(oldJti: string, oldTokenExpDateUnix: number, userId: string): Promise<RefreshTokenMetadata> {
        await this.deleteToken(userId, oldJti);
        // generate a new token with the remaning exp time of the previous one
        const expSeconds = calculateTokenTTL(oldTokenExpDateUnix);
        const { token, jti } = this.generateToken(userId, expSeconds);
        await this.storeToken(userId, jti, expSeconds);
        return { token, jti, expSeconds, id: userId };
    }

    async generate(userId: string): Promise<string>;
    async generate(userId: string, options: { meta: true }): Promise<RefreshTokenMetadata>;
    async generate(userId: string, options?: { meta?: boolean }): Promise<string | RefreshTokenMetadata> {
        const expTime = this.configService.JWT_REFRESH_EXP_TIME;
        const expSeconds = convertExpTimeToSeconds(expTime as StringValue);
        const { token, jti } = this.generateToken(userId, expTime);
        await this.storeToken(userId, jti, expSeconds);
        this.loggerService.info(`Refresh token ${jti} generated, expires at ${expTime}`);
        return (!options?.meta) ? token : {
            token,
            jti,
            id: userId,
            expSeconds
        };
    }

    async rotate(token: string): Promise<string>
    async rotate(token: string, options: { meta: true }): Promise<RefreshTokenMetadata>
    async rotate(token: string, options?: { meta?: boolean }): Promise<string | RefreshTokenMetadata> {
        // token expired or not signed
        const payload = this.jwtService.verify<{ id: string }>(token);
        if (!payload) {
            this.loggerService.error('Refresh token is not valid (expired or not signed by this server)');
            throw HttpError.unAuthorized(authErrors.INVALID_TOKEN);
        }
        // user id not in token        
        const userId = payload.id;
        if (!userId) {
            this.loggerService.error('User id not in token');
            throw HttpError.unAuthorized(authErrors.INVALID_TOKEN);
        }
        // user does not exist        
        const user = await this.userModel.findById(userId).exec();
        if (!user) {
            const errorMsg = 'User in token does not exist';
            this.loggerService.error(errorMsg);
            throw HttpError.unAuthorized(authErrors.INVALID_TOKEN);
        }
        // verify token is in database (not revoked)
        const tokenInRedis = await this.redisService.get(makeRefreshTokenKey(payload.id, payload.jti));
        if (!tokenInRedis) {
            this.loggerService.error('Refresh token has been revoked');
            throw HttpError.unAuthorized(authErrors.INVALID_TOKEN);
        }
        const newTokenData = await this.replaceRefreshToken(payload.jti, payload.exp!, user.id);
        this.loggerService.info(`New refresh token generated: "${newTokenData.token}" for token rotation expires in ${newTokenData.expSeconds}s`)
        return (!options?.meta) ? newTokenData.token : newTokenData;
    }

    // TODO: revoke all tokens

    async revokeToken(userId: string, jti: string) {
        await this.redisService.delete(makeRefreshTokenKey(userId, jti));
        this.loggerService.info(`Refresh token revoked of user "${userId}"`)
    }
}