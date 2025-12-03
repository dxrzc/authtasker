import { Model } from 'mongoose';
import { JwtService } from './jwt.service';
import { ConfigService } from './config.service';
import { LoggerService } from './logger.service';
import { JwtTypes } from 'src/enums/jwt-types.enum';
import { IUser } from 'src/interfaces/user/user.interface';
import { JwtBlackListService } from './jwt-blacklist.service';
import { calculateTokenTTL } from 'src/functions/token/calculate-token-ttl';
import { tokenPurposes } from 'src/constants/token-purposes.constants';
import { UserSessionInfo } from 'src/interfaces/user/user-session-info.interface';
import { HttpError } from 'src/errors/http-error.class';
import { authErrors } from 'src/messages/auth.error.messages';

export class SessionTokenService {
    constructor(
        private readonly configService: ConfigService,
        private readonly jwtService: JwtService,
        private readonly jwtBlacklistService: JwtBlackListService,
        private readonly loggerService: LoggerService,
        private readonly userModel: Model<IUser>,
    ) {}

    generate(userId: string): string {
        const expTime = this.configService.JWT_SESSION_EXP_TIME;
        const { token, jti } = this.jwtService.generate(expTime, {
            purpose: tokenPurposes.SESSION,
            id: userId,
        });
        this.loggerService.info(`Session token ${jti} generated, expires at ${expTime}`);
        return token;
    }

    async blacklist(jti: string, tokenExpirationDateUnix: number): Promise<void> {
        const remainingTokenTTLInSeconds = calculateTokenTTL(tokenExpirationDateUnix);
        if (remainingTokenTTLInSeconds > 0) {
            this.loggerService.info(
                `Session token "${jti}" blacklisted for ${remainingTokenTTLInSeconds} seconds`,
            );
            await this.jwtBlacklistService.blacklist(
                JwtTypes.session,
                jti,
                remainingTokenTTLInSeconds,
            );
        } else {
            this.loggerService.info(
                `Session token "${jti}" already expired, skipping blacklisting`,
            );
        }
    }

    async consume(token: string): Promise<UserSessionInfo> {
        // token is expired or not signed by this server
        const payload = this.jwtService.verify<{ id: string }>(token);
        if (!payload) {
            this.loggerService.error(
                'Session token is not valid (expired or not signed by this server)',
            );
            throw HttpError.unAuthorized(authErrors.INVALID_TOKEN);
        }

        // token purpose is not the expected
        const tokenPurpose = payload.purpose;
        if (tokenPurpose !== tokenPurposes.SESSION) {
            this.loggerService.error(`Session token purpose "${tokenPurpose}" is not the expected`);
            throw HttpError.unAuthorized(authErrors.INVALID_TOKEN);
        }

        // token is blacklisted
        const tokenIsBlacklisted = await this.jwtBlacklistService.tokenInBlacklist(
            JwtTypes.session,
            payload.jti,
        );
        if (tokenIsBlacklisted) {
            this.loggerService.error(`Session token is blacklisted`);
            throw HttpError.unAuthorized(authErrors.INVALID_TOKEN);
        }

        // user id not in token
        const userId = payload.id;
        if (!userId) {
            this.loggerService.error('User id not in session token');
            throw HttpError.unAuthorized(authErrors.INVALID_TOKEN);
        }

        // user in token not exists
        const user = await this.userModel.findById(userId).exec();
        if (!user) {
            const errorMsg = 'User in session token does not exist';
            this.loggerService.error(errorMsg);
            throw HttpError.unAuthorized(authErrors.INVALID_TOKEN);
        }

        return {
            id: user.id,
            role: user.role,
            email: user.email,
            sessionJti: payload.jti,
            sessionTokenExpUnix: payload.exp!,
        };
    }
}
