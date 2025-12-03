import { Model } from 'mongoose';
import { StringValue } from 'ms';
import { JwtService } from './jwt.service';
import { RedisService } from './redis.service';
import { ConfigService } from './config.service';
import { LoggerService } from './logger.service';
import { IUser } from 'src/interfaces/user/user.interface';
import { calculateTokenTTL } from 'src/functions/token/calculate-token-ttl';
import { HttpError } from 'src/errors/http-error.class';
import { makeRefreshTokenKey } from 'src/functions/token/make-refresh-token-key';
import { authErrors } from 'src/messages/auth.error.messages';
import { convertExpTimeToSeconds } from 'src/functions/token/convert-exp-time-to-unix';
import { makeRefreshTokenIndexKey } from 'src/functions/token/make-refresh-token-index-key';
import { allSettledAndThrow } from 'src/functions/js/all-settled-and-throw';

interface RefreshTokenMetadata {
    token: string;
    jti: string;
    id: string;
    expSeconds: number;
}

export class RefreshTokenService {
    constructor(
        private readonly configService: ConfigService,
        private readonly jwtService: JwtService,
        private readonly loggerService: LoggerService,
        private readonly redisService: RedisService,
        private readonly userModel: Model<IUser>,
    ) {}

    private async deleteToken(userId: string, jti: string): Promise<void> {
        await allSettledAndThrow([
            this.redisService.delete(makeRefreshTokenKey(userId, jti)),
            this.redisService.deleteFromList(makeRefreshTokenIndexKey(userId), jti),
        ]);
    }

    private async storeToken(userId: string, jti: string, expiresInSeconds: number): Promise<void> {
        await allSettledAndThrow([
            this.redisService.set(makeRefreshTokenKey(userId, jti), '1', expiresInSeconds),
            this.redisService.addToList(makeRefreshTokenIndexKey(userId), jti),
        ]);
    }

    async validateOrThrow(token: string) {
        // token expired or not signed
        const payload = this.jwtService.verify<{ id: string }>(token);
        if (!payload) {
            this.loggerService.error(
                'Refresh token is not valid (expired or not signed by this server)',
            );
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
        const tokenInRedis = await this.redisService.get(
            makeRefreshTokenKey(payload.id, payload.jti),
        );
        if (!tokenInRedis) {
            this.loggerService.error('Refresh token has been revoked');
            throw HttpError.unAuthorized(authErrors.INVALID_TOKEN);
        }
        return {
            jti: payload.jti,
            userId: payload.id,
            expDateUnix: payload.exp!,
        };
    }

    private generateToken(
        userId: string,
        expiresIn: string | number,
    ): { token: string; jti: string } {
        const expTime = typeof expiresIn === 'number' ? `${expiresIn}s` : expiresIn;
        return this.jwtService.generate(expTime, {
            id: userId,
        });
    }

    private async replaceRefreshToken(
        oldJti: string,
        oldTokenExpDateUnix: number,
        userId: string,
    ): Promise<RefreshTokenMetadata> {
        await this.deleteToken(userId, oldJti);
        // generate a new token with the remaining exp time of the previous one
        const expSeconds = calculateTokenTTL(oldTokenExpDateUnix);
        const { token, jti } = this.generateToken(userId, expSeconds);
        await this.storeToken(userId, jti, expSeconds);
        return { token, jti, expSeconds, id: userId };
    }

    async generate(userId: string): Promise<string>;
    async generate(userId: string, options: { meta: true }): Promise<RefreshTokenMetadata>;
    async generate(
        userId: string,
        options?: { meta?: boolean },
    ): Promise<string | RefreshTokenMetadata> {
        const expTime = this.configService.JWT_REFRESH_EXP_TIME;
        const expSeconds = convertExpTimeToSeconds(expTime as StringValue);
        const { token, jti } = this.generateToken(userId, expTime);
        await this.storeToken(userId, jti, expSeconds);
        this.loggerService.info(`Refresh token ${jti} generated, expires at ${expTime}`);
        return !options?.meta
            ? token
            : {
                  token,
                  jti,
                  id: userId,
                  expSeconds,
              };
    }

    async rotate(token: string): Promise<string>;
    async rotate(token: string, options: { meta: true }): Promise<RefreshTokenMetadata>;
    async rotate(
        token: string,
        options?: { meta?: boolean },
    ): Promise<string | RefreshTokenMetadata> {
        const { jti, expDateUnix, userId } = await this.validateOrThrow(token);
        const newTokenData = await this.replaceRefreshToken(jti, expDateUnix, userId);
        this.loggerService.info(
            `New refresh token generated: "${newTokenData.token}" for token rotation expires in ${newTokenData.expSeconds}s`,
        );
        return !options?.meta ? newTokenData.token : newTokenData;
    }

    async revokeAll(userId: string) {
        const jtis = await this.redisService.getAllListMembers(makeRefreshTokenIndexKey(userId));
        await allSettledAndThrow(jtis.map((jti) => this.revokeToken(userId, jti)));
    }

    async revokeToken(userId: string, jti: string) {
        await this.deleteToken(userId, jti);
        this.loggerService.info(`Refresh token revoked of user "${userId}"`);
    }

    async countUserTokens(userId: string): Promise<number> {
        return await this.redisService.getListSize(makeRefreshTokenIndexKey(userId));
    }

    async deleteOldest(userId: string): Promise<void> {
        const indexKey = makeRefreshTokenIndexKey(userId);
        const oldestTokenJti = await this.redisService.getFrontOfList(indexKey);
        if (!oldestTokenJti) {
            this.loggerService.warn(
                `Tried to delete oldest refresh token of user "${userId}" but none found`,
            );
            return;
        }
        await this.revokeToken(userId, oldestTokenJti);
        this.loggerService.info(`Oldest refresh token of user "${userId}" deleted`);
    }
}
